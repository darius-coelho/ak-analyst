module.exports = {
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
  },
  transformIgnorePatterns: ["/node_modules/(?!d3|d3-array|internmap|delaunator|robust-predicates)"]
};
