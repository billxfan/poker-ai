import Foundation

actor AIEngine {
    private let decisionMaker = AIDecisionMaker()

    func requestDecisionPlan(
        playerId: Int,
        gameState: GameState,
        style: AIStyle,
        patterns: AIPattern?
    ) async -> AIDecisionPlan {
        return await decisionMaker.makeDecisionPlan(
            playerId: playerId,
            gameState: gameState,
            style: style,
            patterns: patterns
        )
    }

    func getThinkingDelay() async -> Double {
        return Double.random(
            in: GameConstants.aiThinkingDelayMin...GameConstants.aiThinkingDelayMax
        )
    }
}
