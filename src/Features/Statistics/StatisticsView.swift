import SwiftUI

struct StatisticsView: View {
    @State private var viewModel = StatisticsViewModel()

    var body: some View {
        ZStack {
            Color.background
                .ignoresSafeArea()

            VStack(spacing: 0) {
                StatisticsTabSelectorView(selectedTab: $viewModel.selectedTab)

                if viewModel.isLoading {
                    StatisticsLoadingStateView()
                } else if let error = viewModel.error {
                    StatisticsErrorStateView(error: error)
                } else {
                    TabView(selection: $viewModel.selectedTab) {
                        StatisticsOverviewTabView(
                            statistics: viewModel.statistics,
                            recentHands: viewModel.recentHands,
                            chips: viewModel.chips
                        )
                        .tag(0)

                        StatisticsAIProfilesTabView(
                            profiles: viewModel.aiProfiles,
                            selectedProfileId: $viewModel.selectedAIProfileId
                        )
                            .tag(1)

                        StatisticsRecentHandsTabView(hands: viewModel.recentHands)
                            .tag(2)
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                    .background(Color.background)
                }
            }
        }
        .navigationTitle(L10n.t("statistics.title"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.background, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.light, for: .navigationBar)
        .tint(Color.textPrimary)
        .task {
            await viewModel.loadData()
        }
    }
}

private struct StatisticsAIProfilesTabView: View {
    let profiles: [AIProfileSummary]
    @Binding var selectedProfileId: Int?

    private var selectedProfile: AIProfileSummary? {
        profiles.first { $0.id == selectedProfileId } ?? profiles.first
    }

    var body: some View {
        VStack(spacing: 0) {
            if profiles.isEmpty {
                VStack {
                    Spacer()
                    Text(L10n.t("statistics.no_ai_profiles"))
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
                .background(Color.background)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(profiles) { profile in
                            profileTab(profile)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                }
                .background(Color.cardBackground)

                ScrollView {
                    if let selectedProfile {
                        StatisticsAIProfileCardView(profile: selectedProfile)
                            .padding(16)
                    }
                }
                .background(Color.background)
            }
        }
    }

    private func profileTab(_ profile: AIProfileSummary) -> some View {
        Button {
            selectedProfileId = profile.id
        } label: {
            HStack(spacing: 6) {
                Text(profile.avatar)
                Text(profile.name)
                    .font(.caption)
                    .fontWeight(selectedProfileId == profile.id ? .semibold : .regular)
            }
            .foregroundColor(selectedProfileId == profile.id ? .white : .textSecondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(selectedProfileId == profile.id ? Color.statistics : Color.background)
            .cornerRadius(8)
        }
    }
}

private struct StatisticsLoadingStateView: View {
    var body: some View {
        VStack {
            Spacer()
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle())
            Text(L10n.t("common.loading"))
                .font(.caption)
                .foregroundColor(.textSecondary)
                .padding(.top, 8)
            Spacer()
        }
    }
}

private struct StatisticsErrorStateView: View {
    let error: String

    var body: some View {
        VStack {
            Spacer()
            Text("⚠️ \(error)")
                .foregroundColor(.error)
            Spacer()
        }
    }
}

#Preview {
    NavigationStack {
        StatisticsView()
    }
}
