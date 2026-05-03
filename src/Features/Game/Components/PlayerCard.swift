import SwiftUI

struct PlayerCard: View {
    let player: Player
    let isThinking: Bool
    let isCurrentActor: Bool
    /// 是否显示底牌：只有自己、或者摊牌阶段才能看
    let shouldRevealCards: Bool
    /// 庄家位置（当前局的按钮位）
    let buttonPosition: Position?
    /// 本局本轮已下注筹码
    let currentRoundBet: Int
    /// 本局累计已下注筹码
    let totalBet: Int

    private var isHuman: Bool {
        player.id == Player.humanPlayerId
    }

    private var chipFontSize: CGFloat {
        isHuman ? 16 : 12
    }

    private var betFontSize: CGFloat {
        isHuman ? 11 : 9
    }

    var body: some View {
        VStack(spacing: 2) {
            // 位置标签行（紧凑）
            HStack(spacing: 3) {
                positionBadge
                Spacer()
                if isThinking {
                    Text("💭")
                        .font(.caption2)
                }
            }

            avatar

            Text(player.name)
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundColor(.textOnDark)
                .lineLimit(1)

            // 下注信息（紧凑）
            VStack(spacing: 0) {
                Text("\(player.chips)")
                    .font(.system(size: chipFontSize, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(.textOnDark.opacity(0.7))
                if currentRoundBet > 0 || totalBet > 0 {
                    HStack(spacing: 2) {
                        if currentRoundBet > 0 {
                            Text(L10n.f("player.round_bet", currentRoundBet))
                                .font(.system(size: betFontSize, weight: .medium, design: .rounded))
                                .monospacedDigit()
                                .foregroundColor(.chipGold)
                        }
                        if totalBet > 0 {
                            Text(L10n.f("player.total_bet", totalBet))
                                .font(.system(size: betFontSize, weight: .medium, design: .rounded))
                                .monospacedDigit()
                                .foregroundColor(.callButton.opacity(0.8))
                        }
                    }
                }
            }

            // 底牌
            HStack(spacing: 1) {
                if shouldRevealCards, let holeCards = player.holeCards {
                    CardView(card: holeCards.card1, width: 20, height: 28)
                    CardView(card: holeCards.card2, width: 20, height: 28)
                } else {
                    CardView(card: nil, width: 20, height: 28)
                    CardView(card: nil, width: 20, height: 28)
                }
            }

            statusBadge
        }
        .padding(6)
        .frame(minWidth: 72)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(statusBackgroundColor)
                .opacity(0.9)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isCurrentActor ? Color.chipGold : Color.clear, lineWidth: 2)
        )
        .scaleEffect(isCurrentActor ? 1.05 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isCurrentActor)
    }

    private var avatar: some View {
        ZStack {
            Circle()
                .fill(Color.white.opacity(0.2))
                .frame(width: 40, height: 40)

            Text(player.avatar)
                .font(.system(size: 24))
        }
    }

    private var positionBadge: some View {
        let text: String
        let color: Color

        if let btn = buttonPosition, player.position == btn {
            text = L10n.t("position.button")
            color = .chipGold
        } else {
            switch player.position {
            case .sb:
                text = L10n.t("position.sb")
                color = .raiseButton
            case .bb:
                text = L10n.t("position.bb")
                color = .raiseButton
            case .utg, .mp, .co, .btn:
                text = player.position.displayName
                color = Color.white.opacity(0.18)
            }
        }

        return Text(text)
            .font(.system(size: 8, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, 4)
            .padding(.vertical, 1)
            .background(color)
            .cornerRadius(3)
    }

    private var thinkingBubble: some View {
        VStack(spacing: 2) {
            Text(L10n.t("player.thinking"))
                .font(.caption2)
                .foregroundColor(.textOnDark)

            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(0.6)
        }
        .padding(6)
        .background(Color.black.opacity(0.6))
        .cornerRadius(8)
    }

    private var statusBadge: some View {
        Group {
            switch player.status {
            case .folded:
                statusLabel(L10n.t("player.status.folded"), color: .folded)
            case .allIn:
                statusLabel(L10n.t("player.status.all_in"), color: .allInButton)
            case .out:
                statusLabel(L10n.t("player.status.out"), color: .disabled)
            case .active:
                if isCurrentActor {
                    statusLabel(L10n.t("player.status.acting"), color: .callButton)
                } else {
                    EmptyView()
                }
            }
        }
    }

    private func statusLabel(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2)
            .foregroundColor(.white)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color)
            .cornerRadius(4)
    }

    private var statusBackgroundColor: Color {
        switch player.status {
        case .folded:
            return .gray.opacity(0.5)
        case .allIn:
            return .allInButton.opacity(0.5)
        case .out:
            return .black.opacity(0.3)
        case .active:
            return player.id == Player.humanPlayerId ? Color.primary.opacity(0.5) : Color.black.opacity(0.3)
        }
    }
}

#Preview {
    ZStack {
        Color.tableGreen
            .ignoresSafeArea()

        HStack(spacing: 12) {
            PlayerCard(
                player: Player.createHuman(position: .bb, chips: 1500),
                isThinking: true,
                isCurrentActor: false,
                shouldRevealCards: true,
                buttonPosition: .btn,
                currentRoundBet: 20,
                totalBet: 20
            )

            PlayerCard(
                player: Player.createAI(id: 1, name: "老K", avatar: "👴", position: .utg, chips: 3000),
                isThinking: false,
                isCurrentActor: true,
                shouldRevealCards: false,
                buttonPosition: .btn,
                currentRoundBet: 0,
                totalBet: 0
            )
        }
    }
}
