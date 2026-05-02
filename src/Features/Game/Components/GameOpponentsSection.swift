import SwiftUI

struct GameOpponentsSection: View {
    let opponents: [Player]
    let thinkingPlayerId: Int?
    let currentActorId: Int?
    let buttonPosition: Position?
    let currentRoundBets: [Int: Int]
    let totalBets: [Int: Int]

    private var leftMiddlePlayer: Player? { player(at: 0) }
    private var topLeftPlayer: Player? { player(at: 1) }
    private var topCenterPlayer: Player? { player(at: 2) }
    private var topRightPlayer: Player? { player(at: 3) }
    private var rightMiddlePlayer: Player? { player(at: 4) }

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                seatSlot(topLeftPlayer)
                seatSlot(topCenterPlayer)
                seatSlot(topRightPlayer)
            }

            HStack(spacing: 8) {
                seatSlot(leftMiddlePlayer)
                Spacer(minLength: 56)
                seatSlot(rightMiddlePlayer)
            }
        }
        .padding(.horizontal, 4)
    }

    private func player(at index: Int) -> Player? {
        guard opponents.indices.contains(index) else { return nil }
        return opponents[index]
    }

    @ViewBuilder
    private func seatSlot(_ player: Player?) -> some View {
        if let player {
            playerSeat(for: player)
        } else {
            Color.clear
                .frame(width: 110, height: 128)
        }
    }

    private func playerSeat(for player: Player) -> some View {
        GamePlayerSeatView(
            player: player,
            isThinking: thinkingPlayerId == player.id,
            isCurrentActor: currentActorId == player.id,
            shouldRevealCards: false,
            buttonPosition: buttonPosition,
            currentRoundBet: currentRoundBets[player.id] ?? 0,
            totalBet: totalBets[player.id] ?? 0
        )
    }
}
