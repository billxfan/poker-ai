import SwiftUI

struct GamePlayerSeatView: View {
    let player: Player
    let isThinking: Bool
    let isCurrentActor: Bool
    let shouldRevealCards: Bool
    let buttonPosition: Position?
    let currentRoundBet: Int
    let totalBet: Int

    var body: some View {
        PlayerCard(
            player: player,
            isThinking: isThinking,
            isCurrentActor: isCurrentActor,
            shouldRevealCards: shouldRevealCards,
            buttonPosition: buttonPosition,
            currentRoundBet: currentRoundBet,
            totalBet: totalBet
        )
        .frame(width: player.id == Player.humanPlayerId ? 160 : 110)
    }
}
