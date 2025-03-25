/**
 * 记忆系统入口模块
 * 提供记忆系统的公共接口
 */

// 导出分阶段记忆类
export { StagedMemory } from './staged/StagedMemory';
export { StageTransitionTrigger } from './staged/StageTransitionTrigger';

// 记忆系统初始化
export const initializeMemorySystem = async (): Promise<void> => {
  console.log('[Memory] 初始化记忆系统...');
  // 在这里可以进行记忆系统的初始化操作
}; 