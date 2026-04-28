import Foundation

actor AIEngine {
    private let decisionMaker = AIDecisionMaker()

    func requestDecision(
        playerId: Int,
        gameState: GameState,
        style: AIStyle,
        patterns: AIPattern?
    ) async -> Action {
        return await decisionMaker.makeDecision(
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
