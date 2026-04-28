import SwiftUI

struct WelfareView: View {
    @State private var viewModel = WelfareViewModel()
    @Environment(\.dismiss) private var dismiss
    let onClaimed: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                headerSection

                dailyFreeSection

                signInSection

                adPlaceholderSection
            }
            .padding(16)
        }
        .background(Color.background)
        .navigationTitle("福利中心")
        .navigationBarTitleDisplayMode(.large)
    }

    private var headerSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "gift.fill")
                .font(.system(size: 48))
                .foregroundColor(.welfare)

            Text("当前筹码")
                .font(.caption)
                .foregroundColor(.textSecondary)

            Text("\(viewModel.chips)")
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundColor(.chipGold)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var dailyFreeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "calendar")
                    .foregroundColor(.success)
                Text("每日免费领")
                    .font(.headline)
                Spacer()
            }

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("每日 2,000 筹码")
                        .font(.subheadline)
                    Text("每日凌晨自动到账")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                if viewModel.hasClaimedDailyFree {
                    Button {
                        claimAndDismiss {
                            viewModel.claimDailyFree()
                            onClaimed()
                        }
                    } label: {
                        Text("已领取 ✓")
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.success)
                            .cornerRadius(8)
                    }
                } else {
                    Button {
                        claimAndDismiss {
                            viewModel.claimDailyFree()
                            onClaimed()
                        }
                    } label: {
                        Text("领取 +2000")
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.secondary)
                            .cornerRadius(8)
                    }
                }
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var signInSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "checkmark.circle")
                    .foregroundColor(.welfare)
                Text("每日签到")
                    .font(.headline)
                Spacer()
            }

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("签到 +1000 筹码")
                        .font(.subheadline)
                    Text("每日可领取一次")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                if viewModel.hasSignedInToday {
                    Button {
                        claimAndDismiss {
                            viewModel.claimSignIn()
                            onClaimed()
                        }
                    } label: {
                        Text("已签到 ✓")
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.success)
                            .cornerRadius(8)
                    }
                } else {
                    Button {
                        claimAndDismiss {
                            viewModel.claimSignIn()
                            onClaimed()
                        }
                    } label: {
                        Text("签到 +1000")
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.welfare)
                            .cornerRadius(8)
                    }
                }
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var adPlaceholderSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "play.rectangle")
                    .foregroundColor(.warning)
                Text("看广告 (即将上线)")
                    .font(.headline)
                Spacer()
            }

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("更多筹码奖励")
                        .font(.subheadline)
                    Text("观看广告获取额外筹码")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                Text("敬请期待")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(6)
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private func claimAndDismiss(action: @escaping () -> Void) {
        action()
        dismiss()
    }
}

#Preview {
    NavigationStack {
        WelfareView(onClaimed: {})
    }
}
