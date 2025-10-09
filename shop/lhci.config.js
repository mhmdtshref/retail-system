module.exports = {
  ci: {
    collect: {
      // CI already starts the app; only collect
      url: ['http://localhost:3000', 'http://localhost:3000/ar/pos'],
      numberOfRuns: 1
    },
    upload: { target: 'filesystem', outputDir: './lhci' },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }]
      }
    }
  }
};
