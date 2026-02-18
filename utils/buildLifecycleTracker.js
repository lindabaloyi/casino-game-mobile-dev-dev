/**
 * Build Lifecycle Tracker - Minimal logging for production performance
 * Tracks build lifecycle silently for diagnostics, no console output
 */

class BuildLifecycleTracker {
  constructor() {
    this.createdBuilds = new Map();
    this.activeSessions = new Map();
    // Removed console.log for production performance
  }

  /**
   * @param {string} buildId
   * @param {string} context - where the build was created
   * @param {Object} [metadata] - any extra info about the build
   */
  trackCreation(buildId, context, metadata = {}) {
    const sessionId = this.getCurrentSession();
    const buildInfo = {
      buildId,
      createdAt: Date.now(),
      context,
      sessionId,
      extensions: [],
      metadata,
      lastSeen: Date.now(),
    };

    this.createdBuilds.set(buildId, buildInfo);
    return buildInfo;
  }

  /**
   * @param {string} buildId
   * @param {string} context - where the extension happened
   * @param {Object} [metadata] - any extra info (e.g. card, source, playerIndex)
   */
  trackExtension(buildId, context, metadata = {}) {
    const build = this.createdBuilds.get(buildId);

    if (build) {
      const extension = {
        timestamp: Date.now(),
        context,
        extensionCount: build.extensions.length + 1,
        metadata,
      };

      build.extensions.push(extension);
      build.lastSeen = Date.now();
      return extension;
    }

    return null;
  }

  getCurrentSession() {
    // Use timestamp-based session for now
    // In a real implementation, this could use game ID or user session
    return `session-${Date.now()}`;
  }

  getBuildSummary(buildId) {
    return this.createdBuilds.get(buildId);
  }

  getAllBuildsSummary() {
    return {
      totalBuilds: this.createdBuilds.size,
      builds: Array.from(this.createdBuilds.entries()).map(([id, data]) => ({
        id,
        created: data.context,
        cards: data.cards,
        extensions: data.extensions.length,
        lastExtension: data.extensions[data.extensions.length - 1]?.addedCard,
        sessionId: data.sessionId,
        lastSeen: new Date(data.lastSeen).toISOString()
      }))
    };
  }

  debugAllBuilds(gameState, context) {
    // Removed console.log for production performance
    // Debug method kept for potential future use but silenced
  }

  // Critical diagnostic method
  diagnoseBuildFlow() {
    const summary = this.getAllBuildsSummary();
    const issues = [];

    summary.builds.forEach(build => {
      if (build.extensions.length === 0) {
        issues.push(`Build ${build.id} was created but never extended`);
      }
    });

    // Check for session consistency issues
    const sessionGroups = new Map();
    this.createdBuilds.forEach(build => {
      if (!sessionGroups.has(build.sessionId)) {
        sessionGroups.set(build.sessionId, []);
      }
      sessionGroups.get(build.sessionId).push(build);
    });

    sessionGroups.forEach((builds, sessionId) => {
      if (builds.length > 3) {
        issues.push(`Session ${sessionId} has ${builds.length} builds - potential memory leak`);
      }
    });

    return {
      summary,
      issues,
      recommendations: issues.length > 0
        ? ['Check build ID consistency', 'Verify UI build selection', 'Test state synchronization', 'Monitor for memory leaks']
        : ['Build flow appears healthy']
    };
  }

  // Reset tracker (useful for testing)
  reset() {
    this.createdBuilds.clear();
    this.activeSessions.clear();
    // Removed console.log for production performance
  }
}

const buildTracker = new BuildLifecycleTracker();

module.exports = {
  BuildLifecycleTracker,
  buildTracker
};
