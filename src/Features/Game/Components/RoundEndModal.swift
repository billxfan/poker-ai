import SwiftUI

struct RoundEndModal: View {
    let winner: Player?
    let winningPlayerIds: [Int]
    let isSplitPot: Bool
    let profit: Int
    let players: [Player]
    let communityCards: [Card]
    let payouts: [Int: Int]
    let handBets: [Int: Int]
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

                            if isSplitPot {
                                let winnerNames = players
                                    .filter { winningPlayerIds.contains($0.id) }
                                    .map { $0.id == Player.humanPlayerId ? "你" : $0.name }
                                    .joined(separator: " / ")

                                Text("平局分池")
                                    .font(.title3)
                                    .fontWeight(.semibold)

                                Text(winnerNames)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            } else if winningPlayerIds.count > 1 {
                                // Side pot: different players won different pots
                                Text("多人获胜")
                                    .font(.title3)
                                    .fontWeight(.semibold)

                                ForEach(players.filter { winningPlayerIds.contains($0.id) }) { player in
                                    let playerProfit = (payouts[player.id] ?? 0) - (handBets[player.id] ?? 0)
                                    HStack {
                                        Text(player.avatar)
                                        Text(player.id == Player.humanPlayerId ? "你" : player.name)
                                        Spacer()
                                        Text(playerProfit >= 0 ? "+\(playerProfit)" : "\(playerProfit)")
                                            .foregroundColor(playerProfit >= 0 ? .success : .error)
                                    }
                                    .font(.subheadline)
                                }
                            } else if let winner {
                                HStack {
                                    Text(winner.avatar)
                                    Text(winner.id == Player.humanPlayerId ? "你获胜!" : "\(winner.name) 获胜")
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
                                        Text(player.id == Player.humanPlayerId ? "你" : player.name)
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
