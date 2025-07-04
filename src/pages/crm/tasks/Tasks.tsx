import { useState, useEffect } from 'react';
// import { useQuery } from '@tanstack/react-query';
// import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Plus, List, Menu, Users, CheckCircle, Clock, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { TaskBoardView } from '@/components/crm/tasks/TaskBoardView';
import { TaskListView } from '@/components/crm/tasks/TaskListView';
import { NewTaskDialog } from '@/components/crm/tasks/NewTaskDialog';
import { EditTaskDialog } from '@/components/crm/tasks/EditTaskDialog';
import { TaskDetailsDialog } from '@/components/crm/tasks/TaskDetailsDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { mockTasks } from '@/components/crm/tasks/MockTaskData';
import { useAddTaskHistory } from '@/hooks/useTaskHistory';
import { TasksFilterBar } from '@/components/crm/tasks/TasksFilterBar';

interface DatabaseTask {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  due_date: string;
  completed: boolean | null;
  deal_id: string | null;
  assigned_to: string | null;
  type_id: string;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  status?: 'todo' | 'doing' | 'done';
  priority?: 'low' | 'medium' | 'high';
  assigned_to_collaborator?: {
    name: string;
  };
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  due_date: string;
  assigned_to_collaborator?: {
    name: string;
  };
  type?: string;
}

interface MockTask {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  assigned_to: string;
  opportunity_id?: string;
  opportunity_name?: string;
  created_by: string;
  responsible: string;
  completed: boolean;
}

interface DetailedTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'doing' | 'done' | 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  due_date: string;
  created_at?: string;
  responsible?: string;
  completed?: boolean;
  type?: string;
  opportunity_id?: string | null;
  opportunity_name?: string | null;
  assigned_to_collaborator?: {
    name: string;
  };
}

type Column = {
  id: 'todo' | 'doing' | 'done';
  title: string;
  tasks: Task[];
};

type UserData = {
  client_id: string;
  first_name?: string;
};

const initialColumns: Column[] = [
  { id: 'todo', title: 'A Fazer', tasks: [] },
  { id: 'doing', title: 'Em Andamento', tasks: [] },
  { id: 'done', title: 'Concluído', tasks: [] },
];

// Helper function to convert mock task to board task format
const convertMockTaskToBoardTask = (mockTask: MockTask): Task => {
  const status = mockTask.completed ? 'done' : mockTask.status === 'pending' ? 'todo' : (mockTask.status as 'todo' | 'doing' | 'done');
  return {
    id: mockTask.id,
    title: mockTask.title,
    status,
    priority: mockTask.priority as 'low' | 'medium' | 'high',
    assigned_to: mockTask.assigned_to,
    due_date: mockTask.due_date,
    type: mockTask.type,
    assigned_to_collaborator: mockTask.responsible ? { name: mockTask.responsible } : undefined
  };
};

// Helper function to convert DatabaseTask to Task
const convertDatabaseTask = (dbTask: DatabaseTask): Task => ({
  id: dbTask.id,
  title: dbTask.title,
  status: dbTask.status || (dbTask.completed ? 'done' : 'todo'),
  priority: dbTask.priority || 'medium',
  assigned_to: dbTask.assigned_to,
  due_date: dbTask.due_date,
  assigned_to_collaborator: dbTask.assigned_to_collaborator
});

// Interface para TaskListView
interface TaskListViewTask {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  due_date: string;
  type: string;
  assigned_to_collaborator?: { name: string };
  description: string;
  created_at: string;
  created_by: string;
  responsible: string;
  completed: boolean;
}

const convertMockTaskToListTask = (mockTask: MockTask): TaskListViewTask => ({
  id: mockTask.id,
  title: mockTask.title,
  status: mockTask.completed ? 'completed' : 'pending',
  priority: mockTask.priority as 'low' | 'medium' | 'high',
  assigned_to: mockTask.assigned_to,
  due_date: mockTask.due_date,
  type: mockTask.type ?? '',
  assigned_to_collaborator: mockTask.responsible ? { name: mockTask.responsible } : undefined,
  description: mockTask.description ?? '',
  created_at: mockTask.created_at ?? '',
  created_by: mockTask.created_by ?? '',
  responsible: mockTask.responsible ?? '',
  completed: mockTask.completed
});

export default function Tasks() {
  const [mockTaskList, setMockTaskList] = useState<MockTask[]>(mockTasks);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DetailedTask | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const addTaskHistory = useAddTaskHistory();
  // Filtros globais
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Colunas que controlam visualmente o Kanban
  const [boardColumnsState, setBoardColumnsState] = useState<Column[]>([]);

  // Atualiza colunas sempre que o mock muda
  useEffect(() => {
    const columns: Column[] = [
      {
        id: 'todo',
        title: 'A Fazer',
        tasks: mockTaskList.filter(t => !t.completed && t.status === 'pending').map(convertMockTaskToBoardTask)
      },
      {
        id: 'doing',
        title: 'Em Andamento',
        tasks: mockTaskList.filter(t => t.status === 'doing').map(convertMockTaskToBoardTask)
      },
      {
        id: 'done',
        title: 'Concluído',
        tasks: mockTaskList.filter(t => t.completed).map(convertMockTaskToBoardTask)
      }
    ];
    setBoardColumnsState(columns);
  }, [mockTaskList]);

  // Atualiza status do mock ao mover
  const handleStatusChange = (taskId: string, newStatus: 'todo' | 'doing' | 'done') => {
    setMockTaskList(prev =>
      prev.map(task =>
        task.id === taskId
          ? {
            ...task,
            status: newStatus,
            completed: newStatus === 'done'
          }
          : task
      )
    );
  };

  // Função para reordenar tarefas na lista
  const handleReorderTasks = (startIndex: number, endIndex: number) => {
    let movedTaskTitle = '';

    setMockTaskList(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      movedTaskTitle = removed.title;
      result.splice(endIndex, 0, removed);
      return result;
    });

    // Feedback para o usuário
    toast({
      title: "Ordem atualizada",
      description: `"${movedTaskTitle}" foi movida para a posição ${endIndex + 1}.`,
      duration: 2000,
    });
  };

  // Função para reordenar tarefas dentro de uma coluna do Kanban
  const handleTaskReorderInColumn = (columnId: 'todo' | 'doing' | 'done', sourceIndex: number, destIndex: number) => {
    setMockTaskList(prev => {
      // Filtrar tarefas da coluna específica
      const getTasksForColumn = (tasks: MockTask[], status: 'todo' | 'doing' | 'done') => {
        if (status === 'todo') return tasks.filter(t => !t.completed && t.status === 'pending');
        if (status === 'doing') return tasks.filter(t => t.status === 'doing');
        if (status === 'done') return tasks.filter(t => t.completed);
        return [];
      };

      const columnTasks = getTasksForColumn(prev, columnId);

      if (sourceIndex >= columnTasks.length || destIndex >= columnTasks.length) return prev;

      // Encontrar a tarefa sendo movida
      const movedTask = columnTasks[sourceIndex];

      // Separar tarefas da coluna atual das outras
      const otherTasks = prev.filter(task => getTasksForColumn([task], columnId).length === 0);

      // Reordenar tarefas da coluna
      const reorderedColumnTasks = [...columnTasks];
      reorderedColumnTasks.splice(sourceIndex, 1);
      reorderedColumnTasks.splice(destIndex, 0, movedTask);

      // Combinar tarefas: primeiro as reordenadas da coluna, depois as outras
      return [...reorderedColumnTasks, ...otherTasks];
    });
  };

  const getTotalTasks = () => boardColumnsState.reduce((total, col) => total + col.tasks.length, 0);
  const getCompletedTasks = () => boardColumnsState.find(col => col.id === 'done')?.tasks.length || 0;
  const getPendingTasks = () => getTotalTasks() - getCompletedTasks();

  const handleAddTask = () => {
    setIsNewTaskDialogOpen(true);
  };

  const handleSaveTask = async (newTask: MockTask) => {
    // Adiciona a nova tarefa no início da lista (última inserida aparece primeiro)
    setMockTaskList(prev => [newTask, ...prev]);

    // Also add to board if it's a board task
    const boardTask = convertMockTaskToBoardTask(newTask);
    setBoardColumnsState(prev => prev.map(col =>
      col.id === boardTask.status
        ? { ...col, tasks: [...col.tasks, boardTask] }
        : col
    ));

    // Registrar no histórico
    try {
      await addTaskHistory.mutateAsync({
        taskId: newTask.id,
        actionType: 'created',
        description: `Tarefa criada: ${newTask.title}`,
        metadata: {
          priority: newTask.priority,
          due_date: newTask.due_date,
          assigned_to: newTask.assigned_to
        }
      });
    } catch (error) {
      console.error('Erro ao registrar histórico:', error);
    }

    toast({
      title: "Tarefa criada",
      description: "A nova tarefa foi criada com sucesso.",
    });
  };

  const handleTaskClick = (taskId: string) => {
    // Find task in mock data first (contains more complete information)
    let task = mockTaskList.find(t => t.id === taskId);

    // If not found in mock data, try to find in board columns
    if (!task) {
      for (const column of boardColumnsState) {
        const foundTask = column.tasks.find(t => t.id === taskId);
        if (foundTask) {
          const detailedTask: DetailedTask = {
            ...foundTask,
            description: `Tarefa do board: ${foundTask.title}`,
            responsible: foundTask.assigned_to_collaborator?.name,
            created_at: new Date().toISOString(),
            completed: foundTask.status === 'done',
            status: foundTask.status === 'done' ? 'completed' : 'pending'
          };
          task = detailedTask as MockTask;
          break;
        }
      }
    }

    if (task) {
      const detailedTask: DetailedTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.completed ? 'completed' : 'pending',
        priority: task.priority as 'low' | 'medium' | 'high',
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        created_at: task.created_at,
        responsible: task.responsible,
        completed: task.completed,
        type: task.type || 'call',
        opportunity_id: task.opportunity_id,
        opportunity_name: task.opportunity_name,
        assigned_to_collaborator: task.responsible ? { name: task.responsible } : undefined
      };
      setSelectedTask(detailedTask);
      setIsTaskDetailsOpen(true);
    }
  };

  const handleTaskEdit = (task: DetailedTask) => {
    // Close details modal and open edit dialog
    setIsTaskDetailsOpen(false);
    setSelectedTask(task);
    setIsEditTaskDialogOpen(true);
  };

  const handleSaveEditedTask = async (updatedTask: DetailedTask) => {
    // Get original task to compare changes
    const originalTask = mockTaskList.find(task => task.id === updatedTask.id);

    if (!originalTask) {
      toast({
        title: "Erro",
        description: "Tarefa original não encontrada.",
        variant: "destructive"
      });
      return;
    }

    // Detect changes
    const changes: Record<string, { old: string | undefined; new: string | undefined }> = {};
    const oldValues: Record<string, string | undefined> = {};
    const newValues: Record<string, string | undefined> = {};

    if (originalTask.title !== updatedTask.title) {
      changes.title = { old: originalTask.title, new: updatedTask.title };
      oldValues.title = originalTask.title;
      newValues.title = updatedTask.title;
    }

    if (originalTask.description !== (updatedTask.description || '')) {
      changes.description = { old: originalTask.description, new: updatedTask.description };
      oldValues.description = originalTask.description;
      newValues.description = updatedTask.description;
    }

    if (originalTask.priority !== updatedTask.priority) {
      changes.priority = { old: originalTask.priority, new: updatedTask.priority };
      oldValues.priority = originalTask.priority;
      newValues.priority = updatedTask.priority;
    }

    if (originalTask.due_date !== updatedTask.due_date) {
      changes.due_date = { old: originalTask.due_date, new: updatedTask.due_date };
      oldValues.due_date = originalTask.due_date;
      newValues.due_date = updatedTask.due_date;
    }

    if (originalTask.responsible !== updatedTask.responsible) {
      changes.assigned_to = { old: originalTask.responsible, new: updatedTask.responsible };
      oldValues.assigned_to = originalTask.responsible;
      newValues.assigned_to = updatedTask.responsible;
    }

    // Update mock task list
    setMockTaskList(prev => prev.map(task =>
      task.id === updatedTask.id
        ? {
          ...task,
          title: updatedTask.title,
          description: updatedTask.description || '',
          type: updatedTask.type || task.type,
          priority: updatedTask.priority,
          due_date: updatedTask.due_date,
          responsible: updatedTask.responsible || task.responsible,
          assigned_to: updatedTask.assigned_to || task.assigned_to,
          opportunity_id: updatedTask.opportunity_id || task.opportunity_id,
          opportunity_name: updatedTask.opportunity_name || task.opportunity_name
        }
        : task
    ));

    // Update board columns
    const boardTask = convertMockTaskToBoardTask({
      ...updatedTask,
      description: updatedTask.description || '',
      type: updatedTask.type || 'call',
      status: updatedTask.completed ? 'completed' : 'pending',
      created_at: updatedTask.created_at || new Date().toISOString(),
      assigned_to: updatedTask.assigned_to || '',
      created_by: 'Usuário Atual',
      responsible: updatedTask.responsible || '',
      completed: updatedTask.completed || false
    } as MockTask);

    setBoardColumnsState(prev => prev.map(col => ({
      ...col,
      tasks: col.tasks.map(task =>
        task.id === updatedTask.id
          ? { ...task, ...boardTask }
          : task
      )
    })));

    // Update selected task if details modal will reopen
    setSelectedTask(updatedTask);

    // Registrar mudanças no histórico apenas se houve alterações
    if (Object.keys(changes).length > 0) {
      try {
        const changedFields = Object.keys(changes);
        const description = changedFields.length === 1
          ? `Campo "${changedFields[0]}" atualizado`
          : `${changedFields.length} campos atualizados: ${changedFields.join(', ')}`;

        await addTaskHistory.mutateAsync({
          taskId: updatedTask.id,
          actionType: 'updated',
          description: `Tarefa editada: ${description}`,
          fieldChanges: changes,
          oldValues,
          newValues,
          metadata: {
            task_title: updatedTask.title,
            fields_changed: changedFields,
            updated_at: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Erro ao registrar edição no histórico:', error);
      }
    }

    toast({
      title: "Tarefa atualizada",
      description: "As alterações foram salvas com sucesso.",
    });
  };

  const handleTaskDelete = async (taskId: string) => {
    // Get task to register in history before deleting
    const taskToDelete = mockTaskList.find(task => task.id === taskId);

    // Remove from board columns
    setBoardColumnsState(prev => prev.map(col => ({
      ...col,
      tasks: col.tasks.filter(t => t.id !== taskId)
    })));

    // Remove from mock task list
    setMockTaskList(prev => prev.filter(task => task.id !== taskId));

    // Close modal
    setIsTaskDetailsOpen(false);
    setSelectedTask(null);

    // Registrar exclusão no histórico
    if (taskToDelete) {
      try {
        await addTaskHistory.mutateAsync({
          taskId: taskId,
          actionType: 'deleted',
          description: `Tarefa excluída: ${taskToDelete.title}`,
          oldValues: {
            title: taskToDelete.title,
            description: taskToDelete.description,
            priority: taskToDelete.priority,
            status: taskToDelete.status,
            completed: taskToDelete.completed
          },
          metadata: {
            deleted_at: new Date().toISOString(),
            was_completed: taskToDelete.completed,
            original_due_date: taskToDelete.due_date
          }
        });
      } catch (error) {
        console.error('Erro ao registrar exclusão no histórico:', error);
      }
    }

    toast({
      title: "Tarefa excluída",
      description: "A tarefa foi removida com sucesso.",
    });
  };

  const ViewModeToggle = () => (
    <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 rounded-lg p-0.5 sm:p-1">
      <Button
        variant={viewMode === 'board' ? 'default' : 'ghost'}
        size="sm"
        className={`h-7 sm:h-8 px-2 sm:px-3 transition-all text-xs sm:text-sm ${viewMode === 'board'
          ? 'bg-white shadow-sm text-slate-900'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        onClick={() => setViewMode('board')}
      >
        <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">Board</span>
        <span className="sm:hidden">B</span>
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        className={`h-7 sm:h-8 px-2 sm:px-3 transition-all text-xs sm:text-sm ${viewMode === 'list'
          ? 'bg-white shadow-sm text-slate-900'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        onClick={() => setViewMode('list')}
      >
        <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">Lista</span>
        <span className="sm:hidden">L</span>
      </Button>
    </div>
  );

  const MobileMenu = () => (
    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <div className="py-4">
          <h2 className="font-semibold mb-4">Menu</h2>
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleAddTask}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          </div>

          {/* Toggle de visualização no mobile */}
          <div className="mt-6">
            <h3 className="font-medium mb-3">Visualização</h3>
            <div className="space-y-2">
              <Button
                variant={viewMode === 'board' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setViewMode('board')}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Board
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setViewMode('list')}
              >
                <List className="mr-2 h-4 w-4" />
                Lista
              </Button>
            </div>
          </div>

          {/* Estatísticas no menu mobile */}
          <div className="mt-6 space-y-3">
            <h3 className="font-medium">Estatísticas</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total
                </span>
                <span className="font-medium">{getTotalTasks()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Pendentes
                </span>
                <span className="font-medium">{getPendingTasks()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Concluídas
                </span>
                <span className="font-medium">{getCompletedTasks()}</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header responsivo */}
      <div className="bg-white border-b px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <MobileMenu />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate">Tarefas</h1>
          </div>
          {/* Estatísticas desktop/tablet */}
          {!isMobile && (
            <div className="flex items-center gap-4 sm:gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">{getTotalTasks()} Total</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                <span className="text-xs sm:text-sm">{getPendingTasks()} Pendentes</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                <span className="text-xs sm:text-sm">{getCompletedTasks()} Concluídas</span>
              </div>
            </div>
          )}
          {/* Ações desktop/tablet */}
          {!isMobile && (
            <div className="flex items-center gap-2 sm:gap-3">
              <ViewModeToggle />
              <Button
                size="sm"
                onClick={handleAddTask}
                className="bg-blue-600 hover:bg-blue-700 shadow-sm px-2 sm:px-3"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">Nova Tarefa</span>
              </Button>
            </div>
          )}
        </div>
        {/* Estatísticas mobile */}
        {isMobile && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-orange-500" />
              <span>{getPendingTasks()} pendentes</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{getCompletedTasks()} concluídas</span>
            </div>
          </div>
        )}
        {/* Barra de filtros única */}
        <div className="mt-4 sm:mt-6">
          <TasksFilterBar
            showStatusFilter={viewMode === 'list'}
            statusFilter={statusFilter}
            onStatusFilterChange={value => setStatusFilter(value as 'pending' | 'completed' | 'all')}
            periodFilter={periodFilter}
            onPeriodFilterChange={setPeriodFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            pendingCount={mockTaskList.filter(t => !t.completed).length}
            completedCount={mockTaskList.filter(t => t.completed).length}
            totalCount={mockTaskList.length}
          />
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        {viewMode === 'board' ? (
          <TaskBoardView
            columns={boardColumnsState}
            onColumnsChange={setBoardColumnsState}
            onTaskClick={handleTaskClick}
            onStatusChange={handleStatusChange}
            onTaskReorder={handleTaskReorderInColumn}
          />
        ) : (
          <div className="h-full overflow-y-auto p-3 sm:p-4 lg:p-6">
            <div className="max-w-6xl mx-auto">
              <TaskListView
                tasks={mockTaskList.map(convertMockTaskToListTask)}
                onAddTask={handleAddTask}
                onTaskClick={handleTaskClick}
                onCompleteTask={(taskId) => handleStatusChange(taskId, 'done')}
                onReorderTasks={handleReorderTasks}
              />
            </div>
          </div>
        )}
      </div>
      {/* Botão flutuante mobile */}
      {isMobile && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
            onClick={handleAddTask}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      )}
      {/* Modal de Nova Tarefa */}
      <NewTaskDialog
        open={isNewTaskDialogOpen}
        onClose={() => setIsNewTaskDialogOpen(false)}
        onSave={handleSaveTask}
      />
      {/* Modal de Editar Tarefa */}
      <EditTaskDialog
        task={selectedTask}
        open={isEditTaskDialogOpen}
        onClose={() => {
          setIsEditTaskDialogOpen(false);
          // Reopen details modal if task is still selected
          if (selectedTask) {
            setIsTaskDetailsOpen(true);
          }
        }}
        onSave={handleSaveEditedTask}
      />
      {/* Modal de Detalhes da Tarefa */}
      <TaskDetailsDialog
        task={selectedTask}
        open={isTaskDetailsOpen}
        onClose={() => {
          setIsTaskDetailsOpen(false);
          setSelectedTask(null);
        }}
        onEdit={handleTaskEdit}
        onDelete={handleTaskDelete}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
