export default {
  presets: ["babel-preset-expo"],
  plugins: [
    [
      "module:react-native-dotenv",
      {
        moduleName: "@env",
        path: ".env",
        safe: true,
        allowUndefined: true,
        verbose: false,
      },
    ],
  ],
};
