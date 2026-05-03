import SwiftUI

struct GameBottomDock: View {
    let humanPlayer: Player?
    let thinkingPlayerId: Int?
    let currentActorId: Int?
    let buttonPosition: Position?
    let currentRoundBets: [Int: Int]
    let totalBets: [Int: Int]
    let showPlayerActions: Bool
    let showWaitingState: Bool
    let callAmount: Int
    let minRaiseAmount: Int
    let potSize: Int
    let canCall: Bool
    let canRaise: Bool
    let canAllIn: Bool
    let onFold: () -> Void
    let onCall: () -> Void
    let onRaise: (Int) -> Void
    let onAllIn: () -> Void

    var body: some View {
        VStack(spacing: 6) {
            if let humanPlayer {
                GamePlayerSeatView(
                    player: humanPlayer,
                    isThinking: thinkingPlayerId == humanPlayer.id,
                    isCurrentActor: currentActorId == humanPlayer.id,
                    shouldRevealCards: true,
                    buttonPosition: buttonPosition,
                    currentRoundBet: currentRoundBets[humanPlayer.id] ?? 0,
                    totalBet: totalBets[humanPlayer.id] ?? 0
                )
                .frame(maxWidth: .infinity)
            }

            if showPlayerActions {
                ActionButtonsView(
                    callAmount: callAmount,
                    minRaiseAmount: minRaiseAmount,
                    potSize: potSize,
                    playerChips: humanPlayer?.chips ?? 0,
                    currentRoundBet: currentRoundBets[Player.humanPlayerId] ?? 0,
                    canCall: canCall,
                    canRaise: canRaise,
                    canAllIn: canAllIn,
                    onFold: onFold,
                    onCall: onCall,
                    onRaise: onRaise,
                    onAllIn: onAllIn
                )
            } else if showWaitingState {
                waitingView
            }
        }
        .padding(.top, 8)
        .background(
            LinearGradient(
                colors: [Color.tableGreen.opacity(0), Color.tableGreen.opacity(0.92), Color.tableGreen],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    private var waitingView: some View {
        HStack {
            Spacer()
            Text(L10n.t("game.waiting"))
                .foregroundColor(.textOnDark.opacity(0.7))
            Spacer()
        }
        .padding()
        .background(Color.black.opacity(0.3))
    }
}
