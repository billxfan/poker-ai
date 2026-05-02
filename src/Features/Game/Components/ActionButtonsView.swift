import SwiftUI

struct ActionButtonsView: View {
    let callAmount: Int
    let minRaiseAmount: Int
    let potSize: Int
    let playerChips: Int
    let currentRoundBet: Int
    let canCall: Bool
    let canRaise: Bool
    let canAllIn: Bool
    let onFold: () -> Void
    let onCall: () -> Void
    let onRaise: (Int) -> Void
    let onAllIn: () -> Void

    @State private var showQuickBet = false

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 12) {
                foldButton

                if callAmount > 0 {
                    callButton
                } else {
                    checkButton
                }

                raiseButton

                allInButton
            }

            if showQuickBet {
                QuickBetView(
                    potSize: potSize,
                    referenceAmount: minRaiseAmount,
                    minimumAmount: minRaiseAmount,
                    currentRoundBet: currentRoundBet,
                    playerChips: playerChips,
                    onSelect: { amount in
                        showQuickBet = false
                        onRaise(amount)
                    },
                    onCancel: {
                        showQuickBet = false
                    }
                )
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.black.opacity(0.8))
    }

    private var foldButton: some View {
        Button(action: onFold) {
            VStack(spacing: 4) {
                Text("🔴")
                    .font(.title3)
                Text("弃牌")
                    .font(.caption)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(Color.foldButton)
            .cornerRadius(12)
        }
    }

    private var callButton: some View {
        Button(action: onCall) {
            VStack(spacing: 4) {
                Text("🟢")
                    .font(.title3)
                Text("跟注 \(callAmount)")
                    .font(.caption)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(canCall ? Color.callButton : Color.disabled)
            .cornerRadius(12)
        }
        .disabled(!canCall)
    }

    private var checkButton: some View {
        Button(action: onCall) {
            VStack(spacing: 4) {
                Text("🟢")
                    .font(.title3)
                Text("过牌")
                    .font(.caption)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(Color.callButton)
            .cornerRadius(12)
        }
    }

    private var raiseButton: some View {
        Button {
            if canRaise {
                showQuickBet.toggle()
            }
        } label: {
            VStack(spacing: 4) {
                Text("🟡")
                    .font(.title3)
                Text("+加注")
                    .font(.caption)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(canRaise ? Color.raiseButton : Color.disabled)
            .cornerRadius(12)
        }
        .disabled(!canRaise)
    }

    private var allInButton: some View {
        Button(action: onAllIn) {
            VStack(spacing: 4) {
                Text("🟠")
                    .font(.title3)
                Text("全下")
                    .font(.caption)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(canAllIn ? Color.allInButton : Color.disabled)
            .cornerRadius(12)
        }
        .disabled(!canAllIn)
    }
}

#Preview {
    VStack {
        Spacer()
        ActionButtonsView(
            callAmount: 100,
            minRaiseAmount: 200,
            potSize: 500,
            playerChips: 500,
            currentRoundBet: 20,
            canCall: true,
            canRaise: true,
            canAllIn: true,
            onFold: {},
            onCall: {},
            onRaise: { _ in },
            onAllIn: {}
        )
    }
    .background(Color.tableGreen)
}
