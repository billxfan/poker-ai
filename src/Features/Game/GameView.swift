import SwiftUI

struct GameView: View {
    @State private var viewModel: GameViewModel
    @State private var didHandleExit = false
    @Environment(\.dismiss) private var dismiss
    private let onExit: () -> Void

    init(
        initialChips: Int,
        restoredGameState: GameState? = nil,
        restoredRemainingDeck: [Card]? = nil,
        restoredResumeMode: GameArchive.ResumeMode = .currentHand,
        onGameEnd: @escaping (Int) -> Void,
        onExit: @escaping () -> Void = {}
    ) {
        _viewModel = State(
            initialValue: GameViewModel(
                initialChips: initialChips,
                restoredGameState: restoredGameState,
                restoredRemainingDeck: restoredRemainingDeck,
                restoredResumeMode: restoredResumeMode,
                onGameEnd: onGameEnd
            )
        )
        self.onExit = onExit
    }

    private var isBlockingOverlayVisible: Bool {
        viewModel.showRoundEndModal || viewModel.showActionLog
    }

    private var seatOrderedOpponents: [Player] {
        viewModel.players
            .filter { $0.id != 0 }
            .sorted { left, right in
                stableSeatRank(for: left) < stableSeatRank(for: right)
            }
    }

    private var currentActorId: Int? {
        viewModel.currentActor?.id
    }

    var body: some View {
        ZStack {
            Color.tableGreen
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 8) {
                    GameCommunitySection(
                        pot: viewModel.pot,
                        callAmount: viewModel.payableCallAmount,
                        streetName: viewModel.gameState.currentStreet.displayName,
                        communityCards: viewModel.communityCards
                    )

                    GameOpponentsSection(
                        opponents: seatOrderedOpponents,
                        thinkingPlayerId: viewModel.thinkingPlayerId,
                        currentActorId: currentActorId,
                        buttonPosition: viewModel.gameState.buttonPosition,
                        currentRoundBets: viewModel.gameState.playerBets,
                        totalBets: viewModel.gameState.handBets
                    )
                }
                .padding(.horizontal, 8)
            }
            .allowsHitTesting(!isBlockingOverlayVisible)

            if viewModel.showRoundEndModal {
                RoundEndModal(
                    winner: viewModel.lastWinner,
                    winningPlayerIds: viewModel.lastWinningPlayerIds,
                    isSplitPot: viewModel.lastIsSplitPot,
                    profit: viewModel.lastProfit,
                    players: viewModel.players,
                    communityCards: viewModel.communityCards,
                    payouts: viewModel.lastPayouts,
                    handBets: viewModel.gameState.handBets,
                    onNextHand: handleNextHand,
                    onReturnToMain: handleReturnToMain
                )
                .zIndex(2)
            }
        }
        .safeAreaInset(edge: .bottom) {
            if !isBlockingOverlayVisible {
                GameBottomDock(
                    humanPlayer: viewModel.humanPlayer,
                    thinkingPlayerId: viewModel.thinkingPlayerId,
                    currentActorId: currentActorId,
                    buttonPosition: viewModel.gameState.buttonPosition,
                    currentRoundBets: viewModel.gameState.playerBets,
                    totalBets: viewModel.gameState.handBets,
                    showPlayerActions: viewModel.viewState == .playerActing,
                    showWaitingState: viewModel.viewState == .aiThinking,
                    callAmount: viewModel.payableCallAmount,
                    minRaiseAmount: viewModel.minRaiseAmount,
                    potSize: viewModel.gameState.pot,
                    canCall: viewModel.canHumanCall,
                    canRaise: viewModel.canHumanRaise,
                    canAllIn: viewModel.canHumanAllIn,
                    onFold: humanFold,
                    onCall: humanCall,
                    onRaise: humanRaise,
                    onAllIn: humanAllIn
                )
            }
        }
        .overlay {
            if viewModel.showActionLog && !viewModel.showRoundEndModal {
                ActionLogView(
                    actions: viewModel.gameState.actionLog,
                    players: viewModel.players,
                    communityCards: viewModel.communityCards,
                    onDismiss: dismissActionLog
                )
                .zIndex(3)
                .transition(.opacity.combined(with: .move(edge: .trailing)))
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            if !viewModel.showRoundEndModal {
                if !viewModel.showActionLog {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button(L10n.t("common.back"), action: handleBack)
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: toggleActionLog) {
                        Image(systemName: viewModel.showActionLog ? "xmark.circle.fill" : "list.bullet")
                            .foregroundColor(viewModel.showActionLog ? .textSecondary : .white)
                    }
                }
            }

            ToolbarItem(placement: .principal) {
                VStack {
                    Text(L10n.f("game.hand_number", viewModel.gameState.handNumber))
                        .font(.headline)
                    Text(L10n.f("game.pot_amount", viewModel.pot))
                        .font(.caption)
                        .foregroundColor(.textOnDark.opacity(0.8))
                }
            }
        }
        .task {
            await startGame()
        }
        .onChange(of: viewModel.triggerNewHand) { _, triggered in
            handleTriggerNewHandChange(triggered)
        }
        .onDisappear {
            handleExitIfNeeded()
        }
    }
}

private extension GameView {
    func startGame() async {
        await viewModel.startGame()
    }

    func handleTriggerNewHandChange(_ triggered: Bool) {
        guard triggered else { return }
        viewModel.showRoundEndModal = false

        Task {
            await viewModel.startGame()
        }
    }

    func toggleActionLog() {
        withAnimation {
            viewModel.showActionLog.toggle()
        }
    }

    func dismissActionLog() {
        viewModel.showActionLog = false
    }

    func handleBack() {
        handleExitIfNeeded()
        dismiss()
    }

    func handleReturnToMain() {
        handleExitIfNeeded()
        dismiss()
    }

    func handleNextHand() {
        viewModel.triggerNewHand = true
    }

    func humanFold() {
        Task {
            await viewModel.humanFold()
        }
    }

    func humanCall() {
        Task {
            await viewModel.humanCall()
        }
    }

    func humanRaise(_ amount: Int) {
        Task {
            await viewModel.humanRaise(amount: amount)
        }
    }

    func humanAllIn() {
        Task {
            await viewModel.humanAllIn()
        }
    }

    func handleExitIfNeeded() {
        guard !didHandleExit else { return }
        didHandleExit = true
        viewModel.prepareForExitFromToolbar()
        onExit()
    }

    func stableSeatRank(for player: Player) -> Int {
        switch player.id {
        case 1: return 0   // human 左手边
        case 2: return 1   // 左上
        case 3: return 2   // 正上
        case 4: return 3   // 右上
        case 5: return 4   // human 右手边
        default: return 100 + player.id
        }
    }
}

#Preview {
    GameView(initialChips: 2000) { _ in }
}
