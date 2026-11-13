export default ({ command }: { command: string }) => ({
  base: command === 'build' ? '/apps/afinador/' : './',
  server: { host: '127.0.0.1', port: 5194, strictPort: true },
  resolve: { preserveSymlinks: true },
  build: { target: 'es2022' },
  test: { include: ['src/**/*.test.ts'] },
});
