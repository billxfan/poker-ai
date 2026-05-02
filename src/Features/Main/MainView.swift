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
            .navigationTitle("德扑AI训练器")
            .navigationBarTitleDisplayMode(.large)
            .alert("⚠️ 确认重置", isPresented: $viewModel.showNewGameConfirmation) {
                Button("取消", role: .cancel) { }
                Button("确认") {
                    loadedArchive = nil  // 清除旧存档，确保新游戏从干净状态开始
                    viewModel.startNewGame()
                    hasSavedArchive = false
                    navigateToGame = true
                }
            } message: {
                Text("此操作将重置所有AI的学习数据，重新从零开始训练")
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
                Text("📅 每日免费领 2,000")
                    .font(.headline)

                Spacer()

                if viewModel.hasClaimedDailyFree {
                    Text("✅ 今日已到账")
                        .font(.caption)
                        .foregroundColor(.success)
                } else {
                    Text("⏳ 即将到账...")
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
                title: "继续游戏",
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
                title: "新开始",
                color: .accent,
                isEnabled: true
            ) {
                viewModel.showNewGameConfirmation = true
            }

            actionButton(
                icon: "🎁",
                title: "福利中心",
                color: .welfare,
                isEnabled: true
            ) {
                navigateToWelfare = true
            }

            actionButton(
                icon: "📊",
                title: "历史统计",
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
}

#Preview {
    MainView()
}
