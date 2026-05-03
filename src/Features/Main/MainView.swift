import SwiftUI

struct MainView: View {
    @State private var viewModel = MainViewModel()
    @AppStorage(GameArchive.archivePresenceKey) private var hasSavedArchive = false
    @State private var navigateToGame = false
    @State private var navigateToWelfare = false
    @State private var navigateToStatistics = false
    @State private var loadedArchive: GameArchive?

    private var canContinueGame: Bool {
        hasSavedArchive || viewModel.hasArchive
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                chipCard

                dailyWelfareCard

                Spacer()

                actionButtons
            }
            .padding(16)
            .background(Color.background)
            .navigationTitle(L10n.t("app.name"))
            .navigationBarTitleDisplayMode(.large)
            .alert(L10n.t("main.reset.title"), isPresented: $viewModel.showNewGameConfirmation) {
                Button(L10n.t("common.cancel"), role: .cancel) { }
                Button(L10n.t("common.confirm")) {
                    loadedArchive = nil  // 清除旧存档，确保新游戏从干净状态开始
                    viewModel.startNewGame()
                    hasSavedArchive = false
                    navigateToGame = true
                }
            } message: {
                Text(L10n.t("main.reset.message"))
            }
            .navigationDestination(isPresented: $navigateToGame) {
                GameView(
                    initialChips: loadedArchive?.gameState.players.first { $0.id == Player.humanPlayerId }?.chips ?? viewModel.getChipsForNewGame(),
                    restoredGameState: loadedArchive?.gameState,
                    restoredRemainingDeck: loadedArchive?.remainingDeck,
                    restoredResumeMode: loadedArchive?.resumeMode ?? .currentHand,
                    onGameEnd: { profit in
                        viewModel.addChipsToPlayer(profit)
                    },
                    onExit: {
                        viewModel.loadState()
                        hasSavedArchive = viewModel.hasArchive
                    }
                )
            }
            .navigationDestination(isPresented: $navigateToWelfare) {
                WelfareView(onClaimed: {
                    viewModel.loadState()
                })
            }
            .navigationDestination(isPresented: $navigateToStatistics) {
                StatisticsView()
            }
            .onAppear {
                viewModel.loadState()
                hasSavedArchive = viewModel.hasArchive
                prepareAds()
            }
            .onChange(of: navigateToGame) { _, isNavigating in
                if !isNavigating {
                    viewModel.loadState()
                    hasSavedArchive = viewModel.hasArchive
                }
            }
        }
    }

    private var chipCard: some View {
        ChipCard(chips: viewModel.chips)
    }

    private var dailyWelfareCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(L10n.t("main.daily_free.title"))
                    .font(.headline)

                Spacer()

                if viewModel.hasClaimedDailyFree {
                    Text(L10n.t("main.daily_free.claimed"))
                        .font(.caption)
                        .foregroundColor(.success)
                } else {
                    Text(L10n.t("main.daily_free.pending"))
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
            }

            ProgressView(value: viewModel.hasClaimedDailyFree ? 1.0 : 0.0)
                .tint(.success)
        }
        .padding(16)
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var actionButtons: some View {
        VStack(spacing: 12) {
            NavigationLink(destination: EmptyView()) {
                EmptyView()
            }
            .hidden()

            actionButton(
                icon: "▶️",
                title: L10n.t("main.continue"),
                color: .secondary,
                isEnabled: canContinueGame
            ) {
                if let archive = viewModel.continueGame() {
                    loadedArchive = archive
                    navigateToGame = true
                } else {
                    viewModel.loadState()
                    hasSavedArchive = viewModel.hasArchive
                }
            }
            .disabled(!canContinueGame)

            actionButton(
                icon: "🔄",
                title: L10n.t("main.new_game"),
                color: .accent,
                isEnabled: true
            ) {
                viewModel.showNewGameConfirmation = true
            }

            actionButton(
                icon: "🎁",
                title: L10n.t("main.welfare"),
                color: .welfare,
                isEnabled: true
            ) {
                navigateToWelfare = true
            }

            actionButton(
                icon: "📊",
                title: L10n.t("main.statistics"),
                color: .statistics,
                isEnabled: true
            ) {
                navigateToStatistics = true
            }
        }
    }

    private func actionButton(
        icon: String,
        title: String,
        color: Color,
        isEnabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack {
                Text(icon)
                    .font(.title3)
                Text(title)
                    .font(.headline)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(isEnabled ? color : Color.disabled)
            .cornerRadius(12)
        }
        .disabled(!isEnabled)
    }

    private func prepareAds() {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootVC = windowScene.windows.first?.rootViewController else { return }
        AdMobService.shared.prepareForAds(from: rootVC)
    }
}

#Preview {
    MainView()
}
