import SwiftUI

struct GameView: View {
    @State private var viewModel: GameViewModel
    @State private var didHandleExit = false
    @Environment(\.dismiss) private var dismiss
    private let onExit: () -> Void

    init(
        initialChips: Int,
        restoredGameState: GameState? = nil,
        restoredResumeMode: GameArchive.ResumeMode = .currentHand,
        onGameEnd: @escaping (Int) -> Void,
        onExit: @escaping () -> Void = {}
    ) {
        _viewModel = State(
            initialValue: GameViewModel(
                initialChips: initialChips,
                restoredGameState: restoredGameState,
                restoredResumeMode: restoredResumeMode,
                onGameEnd: onGameEnd
            )
        )
        self.onExit = onExit
    }

    var body: some View {
        ZStack {
            Color.tableGreen
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 8) {
                    communityArea

                    opponentsArea
                }
                .padding(.horizontal, 8)
            }
            .allowsHitTesting(!isBlockingOverlayVisible)

            if viewModel.showRoundEndModal {
                RoundEndModal(
                    winner: viewModel.lastWinner,
                    winningPlayerIds: viewModel.lastWinningPlayerIds,
                    profit: viewModel.lastProfit,
                    players: viewModel.players,
                    communityCards: viewModel.communityCards,
                    onNextHand: {
                        viewModel.triggerNewHand = true
                    },
                    onReturnToMain: {
                        handleExitIfNeeded()
                        dismiss()
                    }
                )
                .zIndex(2)
            }
        }
        .safeAreaInset(edge: .bottom) {
            if !isBlockingOverlayVisible {
                bottomDock
            }
        }
        .overlay {
            if viewModel.showActionLog && !viewModel.showRoundEndModal {
                ActionLogView(
                    actions: viewModel.gameState.actionLog,
                    players: viewModel.players,
                    communityCards: viewModel.communityCards,
                    onDismiss: { viewModel.showActionLog = false }
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
                        Button("返回") {
                            handleExitIfNeeded()
                            dismiss()
                        }
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        withAnimation {
                            viewModel.showActionLog.toggle()
                        }
                    } label: {
                        Image(systemName: viewModel.showActionLog ? "xmark.circle.fill" : "list.bullet")
                            .foregroundColor(viewModel.showActionLog ? .textSecondary : .white)
                    }
                }
            }

            ToolbarItem(placement: .principal) {
                VStack {
                    Text("第 \(viewModel.gameState.handNumber) 局")
                        .font(.headline)
                    Text("底池: \(viewModel.pot)")
                        .font(.caption)
                        .foregroundColor(.textOnDark.opacity(0.8))
                }
            }
        }
        .task {
            await viewModel.startGame()
        }
        .onChange(of: viewModel.triggerNewHand) { _, triggered in
            if triggered {
                viewModel.showRoundEndModal = false
                Task {
                    await viewModel.startGame()
                }
            }
        }
        .onDisappear {
            handleExitIfNeeded()
        }
    }

    private var isBlockingOverlayVisible: Bool {
        viewModel.showRoundEndModal || viewModel.showActionLog
    }

    private var sortedNonHumanPlayers: [Player] {
        viewModel.players
            .filter { $0.id != 0 }
            .sorted { $0.id < $1.id }
    }

    private var topRowPlayers: [Player] {
        Array(sortedNonHumanPlayers.prefix(3))
    }

    private var middleRowPlayers: [Player] {
        Array(sortedNonHumanPlayers.dropFirst(3).prefix(2))
    }

    private var communityArea: some View {
        VStack(spacing: 8) {
            // 底池信息行（替代原来的 PotDisplay，节省空间）
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("底池")
                        .font(.caption2)
                        .foregroundColor(.textOnDark.opacity(0.6))
                    Text("\(viewModel.pot)")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundColor(.chipGold)
                }

                Spacer()

                if viewModel.callAmount > 0 {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("跟注")
                            .font(.caption2)
                            .foregroundColor(.textOnDark.opacity(0.6))
                        Text("\(viewModel.callAmount)")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.callButton)
                    }
                }

                // 当前街道标签
                Text(viewModel.gameState.currentStreet.displayName)
                    .font(.caption2)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.black.opacity(0.4))
                    .cornerRadius(8)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.black.opacity(0.3))
            .cornerRadius(10)

            CommunityCardsView(cards: viewModel.communityCards)
        }
        .padding(.horizontal, 4)
        .padding(.top, 8)
    }

    private var opponentsArea: some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                ForEach(topRowPlayers) { player in
                    playerCard(for: player)
                }
            }

            HStack(spacing: 8) {
                Spacer(minLength: 0)

                ForEach(middleRowPlayers) { player in
                    playerCard(for: player)
                }

                Spacer(minLength: 0)
            }
        }
        .padding(.horizontal, 4)
    }

    private var bottomDock: some View {
        VStack(spacing: 10) {
            if let human = viewModel.humanPlayer {
                HStack {
                    Spacer(minLength: 0)
                    playerCard(for: human)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 12)
            }

            if viewModel.viewState == .playerActing || viewModel.viewState == .aiThinking {
                actionButtons
            }
        }
        .padding(.top, 12)
        .background(
            LinearGradient(
                colors: [Color.tableGreen.opacity(0), Color.tableGreen.opacity(0.92), Color.tableGreen],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    private func handleExitIfNeeded() {
        guard !didHandleExit else { return }
        didHandleExit = true
        viewModel.prepareForExitFromToolbar()
        onExit()
    }

    private func playerCard(for player: Player) -> some View {
        PlayerCard(
            player: player,
            isThinking: viewModel.thinkingPlayerId == player.id,
            isCurrentActor: viewModel.currentActor?.id == player.id,
            shouldRevealCards: player.id == 0,
            buttonPosition: viewModel.gameState.buttonPosition,
            currentRoundBet: viewModel.gameState.playerBets[player.id] ?? 0,
            totalBet: viewModel.gameState.handBets[player.id] ?? 0
        )
        .frame(width: player.id == 0 ? 220 : 110)
    }

    @ViewBuilder
    private var actionButtons: some View {
        if viewModel.viewState == .playerActing {
            ActionButtonsView(
                callAmount: viewModel.callAmount,
                minRaiseAmount: viewModel.minRaiseAmount,
                playerChips: viewModel.humanPlayer?.chips ?? 0,
                currentRoundBet: viewModel.gameState.playerBets[0] ?? 0,
                canCall: viewModel.canHumanCall,
                canRaise: viewModel.canHumanRaise,
                canAllIn: viewModel.canHumanAllIn,
                onFold: {
                    Task { await viewModel.humanFold() }
                },
                onCall: {
                    Task { await viewModel.humanCall() }
                },
                onRaise: { amount in
                    Task { await viewModel.humanRaise(amount: amount) }
                },
                onAllIn: {
                    Task { await viewModel.humanAllIn() }
                }
            )
        } else if viewModel.viewState == .aiThinking {
            HStack {
                Spacer()
                Text("等待其他玩家...")
                    .foregroundColor(.textOnDark.opacity(0.7))
                Spacer()
            }
            .padding()
            .background(Color.black.opacity(0.3))
        }
    }
}

struct PotDisplay: View {
    let pot: Int
    let callAmount: Int

    var body: some View {
        VStack(spacing: 4) {
            Text("\(pot)")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(.chipGold)

            Text("底池")
                .font(.caption)
                .foregroundColor(.textOnDark.opacity(0.7))

            if callAmount > 0 {
                Text("跟注: \(callAmount)")
                    .font(.caption)
                    .foregroundColor(.callButton)
            }
        }
        .padding(12)
        .background(Color.black.opacity(0.4))
        .cornerRadius(12)
    }
}

struct RoundEndModal: View {
    let winner: Player?
    let winningPlayerIds: [Int]
    let profit: Int
    let players: [Player]
    let communityCards: [Card]
    let onNextHand: () -> Void
    let onReturnToMain: () -> Void

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Color.black.opacity(0.6)
                    .ignoresSafeArea()
                    .onTapGesture { }

                VStack(spacing: 0) {
                    ScrollView {
                        VStack(spacing: 18) {
                            Text("本局结束")
                                .font(.title2)
                                .fontWeight(.bold)

                            if winningPlayerIds.count > 1 {
                                let winnerNames = players
                                    .filter { winningPlayerIds.contains($0.id) }
                                    .map { $0.id == 0 ? "你" : $0.name }
                                    .joined(separator: " / ")

                                Text("平局分池")
                                    .font(.title3)
                                    .fontWeight(.semibold)

                                Text(winnerNames)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            } else if let winner = winner {
                                HStack {
                                    Text(winner.avatar)
                                    Text(winner.id == 0 ? "你获胜!" : "\(winner.name) 获胜")
                                        .fontWeight(.semibold)
                                }
                                .font(.title3)
                            }

                            Text(profit >= 0 ? "+\(profit)" : "\(profit)")
                                .font(.system(size: 48, weight: .bold, design: .rounded))
                                .foregroundColor(profit >= 0 ? .success : .error)

                            VStack(spacing: 8) {
                                Text("公共牌")
                                    .font(.headline)

                                HStack(spacing: 4) {
                                    ForEach(communityCards) { card in
                                        CardView(card: card, width: 36, height: 48)
                                    }
                                }
                            }

                            VStack(spacing: 8) {
                                Text("各方手牌")
                                    .font(.headline)

                                ForEach(players.filter { !$0.isFolded && $0.holeCards != nil }) { player in
                                    HStack {
                                        Text(player.avatar)
                                            .font(.title2)
                                        Text(player.id == 0 ? "你" : player.name)
                                            .font(.subheadline)
                                        if winningPlayerIds.contains(player.id) {
                                            Text("胜")
                                                .font(.caption)
                                                .foregroundColor(.white)
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(Color.success)
                                                .cornerRadius(4)
                                        }
                                        Spacer()
                                        if let holeCards = player.holeCards {
                                            CardView(card: holeCards.card1, width: 32, height: 44)
                                            CardView(card: holeCards.card2, width: 32, height: 44)
                                        }
                                    }
                                    .padding(8)
                                    .background(Color.black.opacity(0.2))
                                    .cornerRadius(8)
                                }
                            }
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 24)
                        .padding(.bottom, 20)
                    }

                    Divider()

                    VStack(spacing: 10) {
                        Button(action: onNextHand) {
                            HStack {
                                Image(systemName: "arrow.right.circle.fill")
                                Text("下一局")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(Color.callButton)
                            .cornerRadius(14)
                        }

                        Button(action: onReturnToMain) {
                            Text("返回主页")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity)
                                .frame(height: 40)
                                .background(Color.clear)
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(Color.secondary.opacity(0.5), lineWidth: 1)
                                )
                        }
                    }
                    .padding(20)
                }
                .frame(maxWidth: min(geometry.size.width - 48, 620))
                .frame(maxHeight: geometry.size.height - 48)
                .background(Color.white)
                .cornerRadius(20)
                .shadow(color: .black.opacity(0.2), radius: 16)
                .padding(24)
            }
        }
    }
}

#Preview {
    GameView(initialChips: 2000) { _ in }
}
