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
        .navigationTitle(L10n.t("welfare.title"))
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(Color.background, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.light, for: .navigationBar)
        .tint(Color.textPrimary)
        .overlay(alignment: .bottom) {
            if let toastMessage = viewModel.toastMessage {
                WelfareToastView(message: toastMessage)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 24)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: viewModel.toastMessage)
    }

    private var headerSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "gift.fill")
                .font(.system(size: 48))
                .foregroundColor(.welfare)

            Text(L10n.t("common.current_chips"))
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
                Text(L10n.t("welfare.daily_free.title"))
                    .font(.headline)
                Spacer()
            }

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L10n.t("welfare.daily_free.reward"))
                        .font(.subheadline)
                    Text(L10n.t("welfare.daily_free.subtitle"))
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
                        Text(L10n.t("welfare.claimed"))
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
                        Text(L10n.t("welfare.claim_2000"))
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
                Text(L10n.t("welfare.sign_in.title"))
                    .font(.headline)
                Spacer()
            }

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L10n.t("welfare.sign_in.reward"))
                        .font(.subheadline)
                    Text(L10n.t("welfare.sign_in.subtitle"))
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
                        Text(L10n.t("welfare.signed_in"))
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
                        Text(L10n.t("welfare.sign_in_1000"))
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
                Text(L10n.t("welfare.reward_ad.title"))
                    .font(.headline)
                Spacer()
            }

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L10n.f("welfare.reward_ad.subtitle", GameConstants.rewardAdChips))
                        .font(.subheadline)
                    Text(L10n.t("welfare.reward_ad.note"))
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                Button {
                    showAd()
                } label: {
                    if viewModel.isAdLoading {
                        ProgressView()
                            .frame(width: 80, height: 32)
                    } else {
                        Text(L10n.f("welfare.claim_amount", GameConstants.rewardAdChips))
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.warning)
                            .cornerRadius(8)
                    }
                }
                .disabled(viewModel.isAdLoading)
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private func showAd() {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootVC = windowScene.windows.first?.rootViewController else { return }
        viewModel.showRewardedAd(from: rootVC)
    }

    private func claimAndDismiss(action: @escaping () -> Void) {
        action()
        dismiss()
    }
}

private struct WelfareToastView: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundColor(.textOnDark)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.black.opacity(0.82))
            .cornerRadius(14)
            .shadow(color: .black.opacity(0.18), radius: 10, x: 0, y: 4)
    }
}

#Preview {
    NavigationStack {
        WelfareView(onClaimed: {})
    }
}
