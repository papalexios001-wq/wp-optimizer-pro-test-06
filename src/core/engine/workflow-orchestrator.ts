/**
 * Enterprise Autonomous Workflow Orchestrator v1.0
 * 
 * SOTA autonomous content generation pipeline with intelligent scheduling,
 * parallel processing, and self-optimizing task management.
 * 
 * Features:
 * - DAG-based workflow execution
 * - Intelligent task prioritization
 * - Parallel processing with concurrency control
 * - Dynamic resource allocation
 * - Real-time progress tracking
 * - Automatic retry and recovery
 * - Event-driven architecture
 * 
 * @module src/core/engine/workflow-orchestrator
 * @version 1.0.0
 */

import { createSelfHealingEngine, type SelfHealingEngine } from './self-healing';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type TaskStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface Task {
  id: string;
  name: string;
  type: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: string[];
  execute: (context: TaskContext) => Promise<TaskResult>;
  timeout?: number;
  retries?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: Error;
  duration: number;
  metrics?: TaskMetrics;
}

export interface TaskMetrics {
  tokensUsed?: number;
  apiCalls?: number;
  cacheHits?: number;
  processingTime: number;
}

export interface TaskContext {
  workflowId: string;
  taskId: string;
  previousResults: Map<string, TaskResult>;
  sharedState: Map<string, unknown>;
  emit: (event: string, data: unknown) => void;
}

export interface Workflow {
  id: string;
  name: string;
  status: WorkflowStatus;
  tasks: Map<string, Task>;
  executionOrder: string[];
  results: Map<string, TaskResult>;
  startedAt?: Date;
  completedAt?: Date;
  progress: number;
}

export interface OrchestratorConfig {
  maxConcurrency: number;
  defaultTimeout: number;
  defaultRetries: number;
  enableMetrics: boolean;
  enableAutoScaling: boolean;
  priorityWeights: Record<TaskPriority, number>;
}

// ============================================================================
// Event Types
// ============================================================================

export type WorkflowEvent = 
  | { type: 'workflow:started'; workflowId: string }
  | { type: 'workflow:completed'; workflowId: string; duration: number }
  | { type: 'workflow:failed'; workflowId: string; error: Error }
  | { type: 'task:started'; workflowId: string; taskId: string }
  | { type: 'task:completed'; workflowId: string; taskId: string; result: TaskResult }
  | { type: 'task:failed'; workflowId: string; taskId: string; error: Error }
  | { type: 'progress:updated'; workflowId: string; progress: number };

export type EventHandler = (event: WorkflowEvent) => void;

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrency: 5,
  defaultTimeout: 60000,
  defaultRetries: 3,
  enableMetrics: true,
  enableAutoScaling: false,
  priorityWeights: {
    critical: 100,
    high: 75,
    normal: 50,
    low: 25,
  },
};

// ============================================================================
// WorkflowOrchestrator Class
// ============================================================================

export class WorkflowOrchestrator {
  private static instance: WorkflowOrchestrator;
  private config: OrchestratorConfig;
  private workflows: Map<string, Workflow>;
  private taskQueue: Task[];
  private runningTasks: Map<string, Promise<TaskResult>>;
  private eventHandlers: Set<EventHandler>;
  private selfHealing: SelfHealingEngine;
  private isProcessing: boolean = false;

  private constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.workflows = new Map();
    this.taskQueue = [];
    this.runningTasks = new Map();
    this.eventHandlers = new Set();
    this.selfHealing = createSelfHealingEngine();
  }

  static getInstance(config?: Partial<OrchestratorConfig>): WorkflowOrchestrator {
    if (!WorkflowOrchestrator.instance) {
      WorkflowOrchestrator.instance = new WorkflowOrchestrator(config);
    }
    return WorkflowOrchestrator.instance;
  }

  // -------------------------------------------------------------------------
  // Workflow Management
  // -------------------------------------------------------------------------

  createWorkflow(name: string, tasks: Omit<Task, 'status' | 'createdAt'>[]): Workflow {
    const workflowId = this.generateId();
    const taskMap = new Map<string, Task>();
    
    for (const taskDef of tasks) {
      const task: Task = {
        ...taskDef,
        status: 'pending',
        createdAt: new Date(),
      };
      taskMap.set(task.id, task);
    }

    const executionOrder = this.computeExecutionOrder(taskMap);

    const workflow: Workflow = {
      id: workflowId,
      name,
      status: 'idle',
      tasks: taskMap,
      executionOrder,
      results: new Map(),
      progress: 0,
    };

    this.workflows.set(workflowId, workflow);
    return workflow;
  }

  private computeExecutionOrder(tasks: Map<string, Task>): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const visiting = new Set<string>();

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected for task: ${taskId}`);
      }

      visiting.add(taskId);
      const task = tasks.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          visit(depId);
        }
      }
      visiting.delete(taskId);
      visited.add(taskId);
      order.push(taskId);
    };

    for (const taskId of tasks.keys()) {
      visit(taskId);
    }

    return order;
  }

  // -------------------------------------------------------------------------
  // Workflow Execution
  // -------------------------------------------------------------------------

  async executeWorkflow(workflowId: string): Promise<Map<string, TaskResult>> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.status = 'running';
    workflow.startedAt = new Date();
    this.emit({ type: 'workflow:started', workflowId });

    try {
      // Queue all tasks in execution order
      for (const taskId of workflow.executionOrder) {
        const task = workflow.tasks.get(taskId);
        if (task) {
          task.status = 'queued';
          this.taskQueue.push(task);
        }
      }

      // Sort by priority
      this.sortTaskQueue();

      // Process tasks
      await this.processTaskQueue(workflow);

      workflow.status = 'completed';
      workflow.completedAt = new Date();
      workflow.progress = 100;

      const duration = workflow.completedAt.getTime() - workflow.startedAt!.getTime();
      this.emit({ type: 'workflow:completed', workflowId, duration });

      return workflow.results;
    } catch (error) {
      workflow.status = 'failed';
      this.emit({ type: 'workflow:failed', workflowId, error: error as Error });
      throw error;
    }
  }

  private async processTaskQueue(workflow: Workflow): Promise<void> {
    this.isProcessing = true;

    while (this.taskQueue.length > 0 || this.runningTasks.size > 0) {
      // Start new tasks up to concurrency limit
      while (
        this.runningTasks.size < this.config.maxConcurrency &&
        this.taskQueue.length > 0
      ) {
        const task = this.getNextReadyTask(workflow);
        if (!task) break;

        this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
        const promise = this.executeTask(task, workflow);
        this.runningTasks.set(task.id, promise);
      }

      // Wait for at least one task to complete
      if (this.runningTasks.size > 0) {
        await Promise.race(this.runningTasks.values());
      }
    }

    this.isProcessing = false;
  }

  private getNextReadyTask(workflow: Workflow): Task | null {
    for (const task of this.taskQueue) {
      const depsCompleted = task.dependencies.every(
        depId => workflow.results.has(depId)
      );
      if (depsCompleted) {
        return task;
      }
    }
    return null;
  }

  private async executeTask(task: Task, workflow: Workflow): Promise<TaskResult> {
    task.status = 'running';
    task.startedAt = new Date();
    this.emit({ type: 'task:started', workflowId: workflow.id, taskId: task.id });

    const context: TaskContext = {
      workflowId: workflow.id,
      taskId: task.id,
      previousResults: workflow.results,
      sharedState: new Map(),
      emit: (event, data) => this.emit({ type: event, ...data } as WorkflowEvent),
    };

    const retries = task.retries ?? this.config.defaultRetries;
    const timeout = task.timeout ?? this.config.defaultTimeout;

    try {
      const result = await this.selfHealing.executeRecovery(
        () => this.executeWithTimeout(task.execute(context), timeout),
        `task:${task.id}`,
        { timeout }
      );

      task.status = 'completed';
      task.completedAt = new Date();
      workflow.results.set(task.id, result);
      this.runningTasks.delete(task.id);

      this.updateProgress(workflow);
      this.emit({ type: 'task:completed', workflowId: workflow.id, taskId: task.id, result });

      return result;
    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      this.runningTasks.delete(task.id);

      const failedResult: TaskResult = {
        success: false,
        error: error as Error,
        duration: Date.now() - task.startedAt!.getTime(),
      };
      workflow.results.set(task.id, failedResult);

      this.emit({ type: 'task:failed', workflowId: workflow.id, taskId: task.id, error: error as Error });
      throw error;
    }
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Task timeout')), timeout);
      promise
        .then(result => { clearTimeout(timer); resolve(result); })
        .catch(error => { clearTimeout(timer); reject(error); });
    });
  }

  // -------------------------------------------------------------------------
  // Helper Methods
  // -------------------------------------------------------------------------

  private sortTaskQueue(): void {
    this.taskQueue.sort((a, b) => {
      const weightA = this.config.priorityWeights[a.priority];
      const weightB = this.config.priorityWeights[b.priority];
      return weightB - weightA;
    });
  }

  private updateProgress(workflow: Workflow): void {
    const completedCount = Array.from(workflow.tasks.values()).filter(
      t => t.status === 'completed'
    ).length;
    workflow.progress = Math.round((completedCount / workflow.tasks.size) * 100);
    this.emit({ type: 'progress:updated', workflowId: workflow.id, progress: workflow.progress });
  }

  private generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // -------------------------------------------------------------------------
  // Event System
  // -------------------------------------------------------------------------

  on(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emit(event: WorkflowEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[Orchestrator] Event handler error:', error);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  cancelWorkflow(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (workflow && workflow.status === 'running') {
      workflow.status = 'failed';
      for (const task of workflow.tasks.values()) {
        if (task.status === 'queued' || task.status === 'pending') {
          task.status = 'cancelled';
        }
      }
      this.taskQueue = this.taskQueue.filter(
        t => !workflow.tasks.has(t.id)
      );
    }
  }

  getMetrics(): {
    totalWorkflows: number;
    runningWorkflows: number;
    queuedTasks: number;
    runningTasks: number;
  } {
    const runningWorkflows = Array.from(this.workflows.values()).filter(
      w => w.status === 'running'
    ).length;

    return {
      totalWorkflows: this.workflows.size,
      runningWorkflows,
      queuedTasks: this.taskQueue.length,
      runningTasks: this.runningTasks.size,
    };
  }
}

// ============================================================================
// Factory & Exports
// ============================================================================

export const createWorkflowOrchestrator = (
  config?: Partial<OrchestratorConfig>
): WorkflowOrchestrator => WorkflowOrchestrator.getInstance(config);

export default WorkflowOrchestrator;
