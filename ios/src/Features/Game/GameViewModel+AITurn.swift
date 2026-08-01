import SwiftUI

extension GameViewModel {
    @MainActor
    func handleAITurn(playerId: Int) async {
        viewState = .aiThinking
        thinkingPlayerId = playerId

        let delay = await aiEngine.getThinkingDelay()
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))

        let aiInfo = AIAvatars.getAvatar(for: playerId)
        let patterns = try? await patternRepository.getPattern(for: playerId)

        let plan = await aiEngine.requestDecisionPlan(
            playerId: playerId,
            gameState: gameState,
            style: aiInfo.style,
            patterns: patterns
        )
        aiDecisionPointsByPlayer[playerId, default: []].append(plan.learningPoint)
        let action = plan.action

        thinkingPlayerId = nil
        _ = await pokerEngine.processAction(playerId: playerId, action: action)
        await refreshFromEngine()
        updateBettingInfo()
        syncArchiveForInProgressGame()
    }

}
