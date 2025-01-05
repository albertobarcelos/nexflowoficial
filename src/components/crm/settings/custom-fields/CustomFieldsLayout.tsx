import { useState, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { FieldTypesSidebar } from "./FieldTypesSidebar";
import { CustomFieldDropZone } from "./components/CustomFieldDropZone";
import { CustomField } from "./types";
import { toast } from "sonner";
import { fieldTypes } from "./data/fieldTypes";

export function CustomFieldsLayout() {
  const [stagedFields, setStagedFields] = useState<Record<string, CustomField[]>>({});

  useEffect(() => {
    console.log('🔄 stagedFields changed:', stagedFields);
  }, [stagedFields]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    console.log('🎯 Drag ended:', { source, destination, draggableId });
    console.log('📦 Current staged fields:', stagedFields);
    
    if (!destination) {
      console.log('❌ No destination, drag cancelled');
      return;
    }

    if (source.droppableId === 'field-types') {
      console.log('🎯 Dragging from field types list');
      const fieldType = fieldTypes.find(f => f.id === draggableId);
      
      if (!fieldType) {
        console.error('❌ Field type not found:', draggableId);
        return;
      }

      const newField: CustomField = {
        id: crypto.randomUUID(),
        name: fieldType.name,
        field_type: fieldType.id,
        description: fieldType.description,
        is_required: false,
        order_index: (stagedFields[destination.droppableId] || []).length,
        client_id: "", // Será preenchido no backend
        pipeline_id: destination.droppableId,
        stage_id: destination.droppableId,
        options: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('✨ Creating new field:', newField);

      setStagedFields(prev => {
        const updatedFields = {
          ...prev,
          [destination.droppableId]: [
            ...(prev[destination.droppableId] || []),
            newField
          ]
        };
        console.log('📝 Updated staged fields:', updatedFields);
        return updatedFields;
      });

      toast.success("Campo adicionado com sucesso!");
      return;
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)]">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-[300px_1fr] gap-6 w-full">
          <FieldTypesSidebar />
          <CustomFieldDropZone
            stageId="entity-fields"
            fields={stagedFields["entity-fields"] || []}
            onEditField={(field) => {
              console.log('✏️ Editing field:', field);
            }}
          />
        </div>
      </DragDropContext>
    </div>
  );
}