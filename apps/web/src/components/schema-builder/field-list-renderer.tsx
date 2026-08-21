"use client";

import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SchemaField } from "./types";
import {
  reparentField,
  convertAndReparentField,
  insertFieldAtPosition,
  deleteFieldFromTree,
  updateFieldInTree,
} from "./schema-helpers";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  HelpCircle,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";

interface FieldListRendererProps {
  fields: SchemaField[];
  allRootFields: SchemaField[];
  onChange: (updatedTree: SchemaField[]) => void;
  onDelete?: (id: string) => void;
  depth?: number;
  parentId?: string | null;
  activeDraggedId?: string | null;
  onDragStateChange?: (id: string | null) => void;
  selectedFieldId?: string | null;
  onSelectFieldId?: (id: string | null) => void;
}

interface DropZoneProps {
  allRootFields: SchemaField[];
  targetParentId: string | null;
  insertIndex: number;
  depth: number;
  onChange: (updatedTree: SchemaField[]) => void;
  activeDraggedId: string | null;
  onDragStateChange?: (id: string | null) => void;
  isHidden?: boolean;
}

function DropZone({
  allRootFields,
  targetParentId,
  insertIndex,
  depth,
  onChange,
  activeDraggedId,
  onDragStateChange,
  isHidden,
}: DropZoneProps) {
  const [isOver, setIsOver] = useState(false);
  const isDraggingAnyField = Boolean(activeDraggedId);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);

    const sourceId = e.dataTransfer.getData("text/plain") || activeDraggedId;
    if (onDragStateChange) onDragStateChange(null);

    if (!sourceId) return;

    const updatedRootTree = insertFieldAtPosition(allRootFields, sourceId, targetParentId, insertIndex);
    onChange(updatedRootTree);
  };

  // Reset isOver state if dragging ends globally
  useEffect(() => {
    if (!isDraggingAnyField) {
      setIsOver(false);
    }
  }, [isDraggingAnyField]);

  // If hidden, or if no card is currently being dragged, keep drop zone completely collapsed!
  if (isHidden || !isDraggingAnyField) {
    return <div className="h-0 overflow-hidden my-0 border-none p-0" />;
  }

  return (
    <div
      data-drop-zone="true"
      data-parent-id={targetParentId ?? "null"}
      data-insert-index={insertIndex}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`transition-all duration-150 flex items-center justify-center rounded-xl cursor-pointer ${
        isOver
          ? "h-10 border-2 border-dashed border-[#e1b329] bg-[#e1b329]/30 shadow-xl shadow-[#e1b329]/30 text-[#2c1d11] dark:text-[#e1b329] my-2 scale-[1.01]"
          : "h-3 border border-dashed border-[#e1b329]/40 bg-[#e1b329]/10 my-1 opacity-70 hover:opacity-100 hover:h-6"
      }`}
    >
      {isOver && (
        <span className="text-[11px] font-extrabold flex items-center gap-1.5 animate-pulse">
          <Plus className="w-3.5 h-3.5 text-[#e1b329]" />
          <span>Insert field here (Depth L{depth})</span>
        </span>
      )}
    </div>
  );
}

export function FieldListRenderer({
  fields,
  allRootFields,
  onChange,
  onDelete,
  depth = 0,
  parentId = null,
  activeDraggedId: externalActiveDraggedId,
  onDragStateChange,
  selectedFieldId = null,
  onSelectFieldId,
}: FieldListRendererProps) {
  const [internalDraggedId, setInternalDraggedId] = useState<string | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentDraggedId = externalActiveDraggedId ?? internalDraggedId;

  const setDraggedId = (id: string | null) => {
    setInternalDraggedId(id);
    if (onDragStateChange) {
      onDragStateChange(id);
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleGlobalCardsCollapse = (collapse: boolean) => {
    const allIds: Record<string, boolean> = {};
    const collectRecursive = (list: SchemaField[]) => {
      for (const item of list) {
        if (collapse) allIds[item.id] = true;
        if (item.properties) collectRecursive(item.properties);
      }
    };
    collectRecursive(allRootFields);
    setCollapsedIds(allIds);
  };

  // Auto-scroll selected card into view inside left panel when selectedFieldId changes
  useEffect(() => {
    if (selectedFieldId && cardRefs.current[selectedFieldId]) {
      cardRefs.current[selectedFieldId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedFieldId]);

  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll loop when dragging a card
  useEffect(() => {
    if (!currentDraggedId) return;

    let mouseY = -1;
    let animId: number | null = null;

    const handleDragOver = (e: DragEvent) => {
      if (e.clientY > 0) {
        mouseY = e.clientY;
      }
    };

    const handleMouseReset = () => {
      mouseY = -1;
    };

    const scrollLoop = () => {
      if (mouseY > 0 && listContainerRef.current) {
        const scrollContainer =
          (listContainerRef.current.closest(".overflow-y-auto") as HTMLElement) ||
          listContainerRef.current;

        if (scrollContainer) {
          const rect = scrollContainer.getBoundingClientRect();
          const topThreshold = rect.top + 60;
          const bottomThreshold = rect.bottom - 60;

          if (mouseY <= topThreshold && mouseY >= rect.top - 30) {
            const distance = topThreshold - mouseY;
            const speed = Math.min(8, Math.max(2, distance * 0.15));
            scrollContainer.scrollTop -= speed;
          } else if (mouseY >= bottomThreshold && mouseY <= rect.bottom + 30) {
            const distance = mouseY - bottomThreshold;
            const speed = Math.min(8, Math.max(2, distance * 0.15));
            scrollContainer.scrollTop += speed;
          }
        }
      }

      animId = requestAnimationFrame(scrollLoop);
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragend", handleMouseReset);
    window.addEventListener("drop", handleMouseReset);
    window.addEventListener("mouseleave", handleMouseReset);

    animId = requestAnimationFrame(scrollLoop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragend", handleMouseReset);
      window.removeEventListener("drop", handleMouseReset);
      window.removeEventListener("mouseleave", handleMouseReset);
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
    };
  }, [currentDraggedId]);

  // Modal state when dragging onto a non-container primitive field
  const [pendingDrop, setPendingDrop] = useState<{
    sourceId: string;
    sourceName: string;
    targetId: string;
    targetName: string;
  } | null>(null);

  const findFieldRecursive = (items: SchemaField[], id: string): SchemaField | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.properties) {
        const found = findFieldRecursive(item.properties, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Auto-expand collapsed container when approached/hovered during drag (500ms hover timer)
  const autoExpandTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentDraggedId && currentDraggedId !== id) {
      setDragOverFieldId(id);
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverFieldId === id) {
      setDragOverFieldId(null);
    }
  };

  // Touch Event Handlers for Mobile & Tablet Touchscreen Drag & Drop
  const [touchSourceId, setTouchSourceId] = useState<string | null>(null);
  const [touchTargetId, setTouchTargetId] = useState<string | null>(null);
  const [touchDropZoneInfo, setTouchDropZoneInfo] = useState<{ parentId: string | null; insertIndex: number } | null>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (touch) {
      setTouchPos({ x: touch.clientX, y: touch.clientY });
    }
    setTouchSourceId(id);
    setDraggedId(id);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchSourceId) return;
    const touch = e.touches[0];
    if (!touch) return;

    const touchY = touch.clientY;
    setTouchPos({ x: touch.clientX, y: touch.clientY });

    // Touch Auto-scroll container when dragging near top or bottom
    if (listContainerRef.current) {
      const scrollContainer =
        (listContainerRef.current.closest(".overflow-y-auto") as HTMLElement) ||
        listContainerRef.current;

      if (scrollContainer) {
        const rect = scrollContainer.getBoundingClientRect();
        const topThreshold = rect.top + 65;
        const bottomThreshold = rect.bottom - 65;

        if (touchY <= topThreshold && touchY >= rect.top - 30) {
          const distance = topThreshold - touchY;
          const speed = Math.min(10, Math.max(2, distance * 0.2));
          scrollContainer.scrollTop -= speed;
        } else if (touchY >= bottomThreshold && touchY <= rect.bottom + 30) {
          const distance = touchY - bottomThreshold;
          const speed = Math.min(10, Math.max(2, distance * 0.2));
          scrollContainer.scrollTop += speed;
        }
      }
    }

    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elementUnderTouch) {
      // 1. Check if touch is over a DropZone (including empty container section drop zones)
      const dropZoneEl = elementUnderTouch.closest("[data-drop-zone]");
      if (dropZoneEl) {
        const pId = dropZoneEl.getAttribute("data-parent-id");
        const idxStr = dropZoneEl.getAttribute("data-insert-index");
        if (idxStr !== null) {
          setTouchDropZoneInfo({
            parentId: !pId || pId === "null" ? null : pId,
            insertIndex: parseInt(idxStr, 10),
          });
          setTouchTargetId(null);
          setDragOverFieldId(null);
          return;
        }
      }

      // 2. Check if touch is over a Field Card
      const cardEl = elementUnderTouch.closest("[data-field-id]");
      if (cardEl) {
        const targetId = cardEl.getAttribute("data-field-id");
        if (targetId && targetId !== touchSourceId) {
          setTouchTargetId(targetId);
          setTouchDropZoneInfo(null);
          setDragOverFieldId(targetId);
          return;
        }
      }
    }

    setTouchDropZoneInfo(null);
    setTouchTargetId(null);
    setDragOverFieldId(null);
  };

  // Auto-expand collapsed container section when approached/hovered for 500ms
  useEffect(() => {
    const hoveredId = dragOverFieldId || touchTargetId;
    if (!hoveredId || !currentDraggedId) {
      if (autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current);
        autoExpandTimerRef.current = null;
      }
      return;
    }

    const targetItem = findFieldRecursive(allRootFields, hoveredId);
    const isTargetContainer =
      targetItem &&
      (targetItem.type === "object" || (targetItem.type === "array" && targetItem.arrayItemType === "object"));
    const isCollapsed = collapsedIds[hoveredId] === true;

    if (isTargetContainer && isCollapsed) {
      if (!autoExpandTimerRef.current) {
        autoExpandTimerRef.current = setTimeout(() => {
          setCollapsedIds((prev) => ({ ...prev, [hoveredId]: false }));
          autoExpandTimerRef.current = null;
        }, 500);
      }
    } else {
      if (autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current);
        autoExpandTimerRef.current = null;
      }
    }

    return () => {
      if (autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current);
        autoExpandTimerRef.current = null;
      }
    };
  }, [dragOverFieldId, touchTargetId, currentDraggedId, collapsedIds, allRootFields]);

  const handleTouchEnd = () => {
    if (touchSourceId) {
      if (touchDropZoneInfo) {
        // Insert directly into target dropzone (including inside empty containers)
        const updatedRootTree = insertFieldAtPosition(
          allRootFields,
          touchSourceId,
          touchDropZoneInfo.parentId,
          touchDropZoneInfo.insertIndex
        );
        onChange(updatedRootTree);
      } else if (touchTargetId && touchSourceId !== touchTargetId) {
        const sourceItem = findFieldRecursive(allRootFields, touchSourceId);
        const targetItem = findFieldRecursive(allRootFields, touchTargetId);

        if (targetItem) {
          const isTargetContainer =
            targetItem.type === "object" || targetItem.type === "array";

          if (isTargetContainer) {
            const updatedRootTree = reparentField(allRootFields, touchSourceId, touchTargetId);
            onChange(updatedRootTree);
          } else {
            setPendingDrop({
              sourceId: touchSourceId,
              sourceName: sourceItem?.name || "Field",
              targetId: touchTargetId,
              targetName: targetItem.name || "Target Field",
            });
          }
        }
      }
    }

    setTouchSourceId(null);
    setTouchTargetId(null);
    setTouchDropZoneInfo(null);
    setTouchPos(null);
    setDraggedId(null);
    setDragOverFieldId(null);
  };

  const handleDrop = (e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData("text/plain") || currentDraggedId;
    
    // Reset drag state immediately!
    setDraggedId(null);
    setDragOverFieldId(null);

    if (!sourceId || sourceId === targetFieldId) return;

    const sourceItem = findFieldRecursive(allRootFields, sourceId);
    const targetItem = findFieldRecursive(allRootFields, targetFieldId);

    if (!targetItem) return;

    const isTargetContainer =
      targetItem.type === "object" || targetItem.type === "array";

    if (isTargetContainer) {
      // Reparent directly into container without any popup
      const updatedRootTree = reparentField(allRootFields, sourceId, targetFieldId);
      onChange(updatedRootTree);
    } else {
      // Target is a primitive field. Prompt user with high z-index portal modal!
      setPendingDrop({
        sourceId,
        sourceName: sourceItem?.name || "Field",
        targetId: targetFieldId,
        targetName: targetItem.name || "Target Field",
      });
    }
  };

  const handleConfirmConvert = (containerType: "object" | "array") => {
    if (!pendingDrop) return;
    const updatedRootTree = convertAndReparentField(
      allRootFields,
      pendingDrop.sourceId,
      pendingDrop.targetId,
      containerType
    );
    onChange(updatedRootTree);
    setPendingDrop(null);
  };

  const handleConfirmReorder = () => {
    if (!pendingDrop) return;
    const updatedRootTree = reparentField(allRootFields, pendingDrop.sourceId, parentId);
    onChange(updatedRootTree);
    setPendingDrop(null);
  };

  // Card background alternating based on nested DEPTH level
  const getDepthAlternatingCardClasses = (d: number) => {
    const isEvenDepth = d % 2 === 0;
    const depthStripe =
      d === 1
        ? "border-l-4 border-l-[#e1b329]"
        : d === 2
        ? "border-l-4 border-l-purple-500"
        : d >= 3
        ? "border-l-4 border-l-emerald-500"
        : "";

    if (isEvenDepth) {
      return `bg-[#ffffff] dark:bg-[#120e0b] border-[#edd6bb]/40 dark:border-[#edd6bb]/20 shadow-md ${depthStripe}`;
    }
    return `bg-[#f9f2e8] dark:bg-[#1b1510] border-[#e1b329]/30 dark:border-[#e1b329]/20 shadow-md ${depthStripe}`;
  };

  const getDepthAlternatingHeaderBarClasses = (d: number) => {
    const isEvenDepth = d % 2 === 0;
    if (isEvenDepth) {
      return "bg-[#f5ebe0] dark:bg-[#1f1712] border-[#edd6bb]/40 dark:border-[#edd6bb]/20";
    }
    return "bg-[#eedfcb] dark:bg-[#281e18] border-[#e1b329]/40 dark:border-[#e1b329]/25";
  };

  const getDepthAlternatingInputClasses = (d: number) => {
    const isEvenDepth = d % 2 === 0;
    if (isEvenDepth) {
      return "bg-[#ffffff] dark:bg-slate-950 border border-[#edd6bb]/50 dark:border-[#edd6bb]/30 text-[#2c1d11] dark:text-slate-100 placeholder:opacity-50";
    }
    return "bg-[#f5ebe0] dark:bg-black/70 border border-[#e1b329]/40 dark:border-[#e1b329]/30 text-[#2c1d11] dark:text-slate-100 placeholder:opacity-50";
  };

  // Find index of dragged field within current fields array
  const draggedFieldIdxInLevel = fields.findIndex((f) => f.id === currentDraggedId);

  return (
    <div className="space-y-3 relative">
      {/* Floating Touch Drag Indicator Badge for Mobile/Tablet */}
      {touchSourceId && touchPos && (
        <div
          className="fixed z-[1000] pointer-events-none -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-[#e1b329] text-slate-950 font-extrabold text-xs shadow-2xl border-2 border-slate-950 flex items-center gap-2 animate-bounce"
          style={{ left: touchPos.x, top: touchPos.y - 35 }}
        >
          <GripVertical className="w-4 h-4 text-slate-950" />
          <span>Moving: &quot;{findFieldRecursive(allRootFields, touchSourceId)?.name || "Field"}&quot;</span>
        </div>
      )}

      {/* Global Expand / Collapse Control Toolbar for Root Level */}
      {depth === 0 && fields.length > 0 && (
        <div className="flex items-center justify-between pb-1 px-1">
          <div className="text-[11px] font-mono font-extrabold text-[#b45309] dark:text-[#ffb443] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#e1b329]" />
            <span>Root Schema ({fields.length} Properties)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleGlobalCardsCollapse(false)}
              className="px-2 py-0.5 rounded-lg bg-[#edd6bb]/30 dark:bg-[#edd6bb]/15 hover:bg-[#e1b329]/25 text-[#5c4b3c] dark:text-[#ffb443] text-[10px] font-extrabold transition-all border border-[#d8be9f] dark:border-[#edd6bb]/20 flex items-center gap-1"
              title="Expand all cards in editor"
            >
              <ChevronsDown className="w-3 h-3 text-[#e1b329]" />
              <span>Expand All</span>
            </button>
            <button
              type="button"
              onClick={() => toggleGlobalCardsCollapse(true)}
              className="px-2 py-0.5 rounded-lg bg-[#edd6bb]/30 dark:bg-[#edd6bb]/15 hover:bg-[#e1b329]/25 text-[#5c4b3c] dark:text-[#ffb443] text-[10px] font-extrabold transition-all border border-[#d8be9f] dark:border-[#edd6bb]/20 flex items-center gap-1"
              title="Collapse all cards in editor"
            >
              <ChevronsUp className="w-3 h-3 text-[#e1b329]" />
              <span>Collapse All</span>
            </button>
          </div>
        </div>
      )}

      <div ref={listContainerRef} className={`space-y-1 ${depth > 0 ? "pl-3 sm:pl-5 border-l-2 border-[#e1b329]/40 my-2" : "px-1.5 py-1"}`}>
        {/* Top Drop Zone (insert index 0) - Hidden if dragged field is at index 0 */}
        <DropZone
          allRootFields={allRootFields}
          targetParentId={parentId}
          insertIndex={0}
          depth={depth}
          onChange={onChange}
          activeDraggedId={currentDraggedId}
          onDragStateChange={setDraggedId}
          isHidden={draggedFieldIdxInLevel === 0}
        />

        {fields.map((field, idx) => {
          const isContainer =
            field.type === "object" || (field.type === "array" && field.arrayItemType === "object");
          const isDraggingThis = currentDraggedId === field.id;
          const isDragOverThis = dragOverFieldId === field.id;
          const isCollapsed = collapsedIds[field.id] === true;

          const isSelected = selectedFieldId === field.id;

          // Drop zone after field[idx] (insertIndex = idx + 1) is hidden if field[idx] or field[idx+1] is the dragged field
          const isAfterDropZoneHidden =
            draggedFieldIdxInLevel !== -1 &&
            (draggedFieldIdxInLevel === idx || draggedFieldIdxInLevel === idx + 1);

          return (
            <React.Fragment key={`${field.id}_depth_${depth}`}>
              <div
                data-field-id={field.id}
                ref={(el) => { cardRefs.current[field.id] = el; }}
                draggable
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectFieldId) {
                    onSelectFieldId(field.id);
                  }
                }}
                onDragStart={(e) => handleDragStart(e, field.id)}
                onDragOver={(e) => handleDragOver(e, field.id)}
                onDragLeave={(e) => handleDragLeave(e, field.id)}
                onDrop={(e) => handleDrop(e, field.id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverFieldId(null);
                }}
                className={`p-3.5 sm:p-4 rounded-2xl transition-all space-y-3 cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-[#e1b329] bg-[#e1b329]/15 dark:bg-[#e1b329]/25 shadow-xl shadow-[#e1b329]/25 border-[#e1b329]"
                    : ""
                } ${
                  isDraggingThis
                    ? "opacity-40 border-dashed border-[#e1b329]"
                    : isDragOverThis
                    ? "border-[#e1b329] bg-[#e1b329]/30 shadow-xl shadow-[#e1b329]/30"
                    : getDepthAlternatingCardClasses(depth)
                }`}
              >

                {/* Sleek Field Header Bar */}
                <div className={`flex items-center justify-between gap-2 p-2 rounded-xl border ${getDepthAlternatingHeaderBarClasses(depth)}`}>
                  <div className="flex items-center gap-2">
                    <span
                      onTouchStart={(e) => handleTouchStart(e, field.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-[#e1b329]/30 rounded-lg text-[#e1b329] transition-colors touch-none"
                      title="Drag handle: Touch or drag to move field"
                    >
                      <GripVertical className="w-4 h-4" />
                    </span>

                    {/* Arrow Toggle Button to Collapse / Expand */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(field.id);
                      }}
                      className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[#e1b329] transition-colors"
                      title={isCollapsed ? "Expand field content & children" : "Collapse field content & children"}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <span className="font-mono text-xs font-extrabold text-[#2c1d11] dark:text-[#edd6bb]">
                      {field.name || <span className="opacity-50 italic">unnamed_field</span>}
                    </span>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#e1b329]/20 text-[#b45309] dark:text-[#ffb443] border border-[#e1b329]/30">
                      {field.type.toUpperCase()}
                      {field.type === "array" && field.arrayItemType ? ` <${field.arrayItemType}>` : ""}
                    </span>

                    {isSelected && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#e1b329] text-slate-950 shadow-sm animate-pulse">
                        Active
                      </span>
                    )}

                    {/* Summary badge when collapsed */}
                    {isCollapsed && isContainer && field.properties && field.properties.length > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#e1b329]/25 text-[#b45309] dark:text-[#ffb443]">
                        {field.properties.length} sub-properties hidden
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => onChange(deleteFieldFromTree(allRootFields, field.id))}
                      title="Delete field"
                      className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Content Area (Field Inputs & Sub-properties) */}
                {!isCollapsed && (
                  <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                    {/* Field Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-extrabold opacity-80 mb-1 text-[#2c1d11] dark:text-slate-200">Field Name</label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => {
                            const updatedRootTree = updateFieldInTree(allRootFields, field.id, { name: e.target.value });
                            onChange(updatedRootTree);
                          }}
                          className={`w-full rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none shadow-sm ${getDepthAlternatingInputClasses(depth)}`}
                          placeholder="e.g. total_amount"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-extrabold opacity-80 mb-1 text-[#2c1d11] dark:text-slate-200">Data Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const newType = e.target.value as any;
                            const patch: Partial<SchemaField> = { type: newType };
                            if (newType === "object" && !field.properties) {
                              patch.properties = [];
                            }
                            if (newType === "array" && !field.arrayItemType) {
                              patch.arrayItemType = "string";
                            }
                            const updatedRootTree = updateFieldInTree(allRootFields, field.id, patch);
                            onChange(updatedRootTree);
                          }}
                          className={`w-full rounded-xl px-2.5 py-1.5 text-xs font-extrabold focus:outline-none shadow-sm ${getDepthAlternatingInputClasses(depth)}`}
                        >
                          <option value="string" className="bg-[#ffffff] dark:bg-slate-900 text-[#2c1d11] dark:text-slate-100">string (Text)</option>
                          <option value="number" className="bg-[#ffffff] dark:bg-slate-900 text-[#2c1d11] dark:text-slate-100">number (Float)</option>
                          <option value="integer" className="bg-[#ffffff] dark:bg-slate-900 text-[#2c1d11] dark:text-slate-100">integer (Whole Num)</option>
                          <option value="boolean" className="bg-[#ffffff] dark:bg-slate-900 text-[#2c1d11] dark:text-slate-100">boolean (True/False)</option>
                          <option value="date" className="bg-[#ffffff] dark:bg-slate-900 text-[#2c1d11] dark:text-slate-100">date (YYYY-MM-DD)</option>
                          <option value="enum" className="bg-[#ffffff] dark:bg-slate-900 text-[#2c1d11] dark:text-slate-100">enum (Options List)</option>
                          <option value="object" className="bg-[#ffffff] dark:bg-slate-900 text-[#2c1d11] dark:text-slate-100">object (Nested Properties)</option>
                          <option value="array" className="bg-[#ffffff] dark:bg-slate-900 text-[#2c1d11] dark:text-slate-100">array (List Items)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4 flex items-center justify-between sm:justify-start gap-3 pt-3 sm:pt-4">
                        <label className="flex items-center gap-1.5 text-xs font-extrabold cursor-pointer select-none text-[#2c1d11] dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => {
                              const updatedRootTree = updateFieldInTree(allRootFields, field.id, { required: e.target.checked });
                              onChange(updatedRootTree);
                            }}
                            className="rounded border-[#edd6bb]/50 text-[#e1b329] focus:ring-0"
                          />
                          <span>Required</span>
                        </label>
                      </div>
                    </div>

                    {/* Description Input */}
                    <div>
                      <input
                        type="text"
                        value={field.description || ""}
                        onChange={(e) => {
                          const updatedRootTree = updateFieldInTree(allRootFields, field.id, { description: e.target.value });
                          onChange(updatedRootTree);
                        }}
                        className={`w-full rounded-xl px-2.5 py-1.5 text-[11px] focus:outline-none shadow-sm ${getDepthAlternatingInputClasses(depth)}`}
                        placeholder="Field description/instructions for AI model extraction..."
                      />
                    </div>

                    {/* Enum Values Input */}
                    {field.type === "enum" && (
                      <div className="pt-1">
                        <label className="text-[10px] font-extrabold text-[#d97706] dark:text-[#ffb443]">Allowed Enum Values (comma-separated):</label>
                        <input
                          type="text"
                          value={field.enumValues || ""}
                          onChange={(e) => {
                            const updatedRootTree = updateFieldInTree(allRootFields, field.id, { enumValues: e.target.value });
                            onChange(updatedRootTree);
                          }}
                          className="w-full mt-1 bg-[#ffffff] dark:bg-slate-950 border border-[#e1b329]/50 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-[#b45309] dark:text-[#ffb443] focus:outline-none shadow-sm"
                          placeholder="e.g. APPROVED, REJECTED, PENDING"
                        />
                      </div>
                    )}

                    {/* Array Options */}
                    {field.type === "array" && (
                      <div className="pt-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-extrabold text-[#2c1d11] dark:text-slate-200">Array Element Type:</span>
                          <select
                            value={field.arrayItemType || "string"}
                            onChange={(e) => {
                              const newArrayItemType = e.target.value as any;
                              const patch: Partial<SchemaField> = { arrayItemType: newArrayItemType };
                              if (newArrayItemType === "object" && !field.properties) {
                                patch.properties = [];
                              }
                              const updatedRootTree = updateFieldInTree(allRootFields, field.id, patch);
                              onChange(updatedRootTree);
                            }}
                            className={`rounded-xl px-2 py-1 text-xs font-extrabold shadow-sm ${getDepthAlternatingInputClasses(depth)}`}
                          >
                            <option value="string" className="bg-[#ffffff] dark:bg-slate-900 text-[#2c1d11] dark:text-slate-100">string</option>
                            <option value="number" className="bg-[#ffffff] dark:bg-slate-900 text-[#2c1d11] dark:text-slate-100">number</option>
                            <option value="object" className="bg-[#ffffff] dark:bg-slate-900 text-[#2c1d11] dark:text-slate-100">object (Array of Nested Objects)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Child Properties Container */}
                    {isContainer && (
                      <div className="pt-3 border-t border-[#edd6bb]/30 dark:border-[#edd6bb]/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-[#b45309] dark:text-[#e1b329] flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Sub-Properties ({field.properties?.length || 0})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const childList = [...(field.properties || [])];
                              childList.push({
                                id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                name: "",
                                type: "string",
                                required: true,
                              });
                              const updatedRootTree = updateFieldInTree(allRootFields, field.id, { properties: childList });
                              onChange(updatedRootTree);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 text-[11px] font-extrabold shadow-sm flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Sub-Property</span>
                          </button>
                        </div>

                        {field.properties && field.properties.length > 0 ? (
                          <FieldListRenderer
                            fields={field.properties}
                            allRootFields={allRootFields}
                            onChange={onChange}
                            onDelete={onDelete}
                            depth={depth + 1}
                            parentId={field.id}
                            activeDraggedId={currentDraggedId}
                            onDragStateChange={setDraggedId}
                            selectedFieldId={selectedFieldId}
                            onSelectFieldId={onSelectFieldId}
                          />
                        ) : (
                          <div className="py-2 border border-dashed border-[#e1b329]/40 rounded-xl p-2 bg-[#e1b329]/5">
                            <DropZone
                              allRootFields={allRootFields}
                              targetParentId={field.id}
                              insertIndex={0}
                              depth={depth + 1}
                              onChange={onChange}
                              activeDraggedId={currentDraggedId}
                              onDragStateChange={setDraggedId}
                            />
                            <p className="text-[11px] opacity-80 italic pl-1 text-[#5c4b3c] dark:text-slate-300 font-bold flex items-center gap-1 mt-1">
                              <span>Empty Container: Drag fields into dropzone above or click &quot;Add Sub-Property&quot;.</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Drop Zone (insert index = idx + 1) */}
              <DropZone
                allRootFields={allRootFields}
                targetParentId={parentId}
                insertIndex={idx + 1}
                depth={depth}
                onChange={onChange}
                activeDraggedId={currentDraggedId}
                onDragStateChange={setDraggedId}
                isHidden={isAfterDropZoneHidden}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* Confirmation Modal Portal for Converting Primitive Target into Container (Rendered directly at document.body level) */}
      {pendingDrop && mounted && createPortal(
        <div
          onClick={() => setPendingDrop(null)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel bg-[#fdfaf5] dark:bg-[#120e0b] border-2 border-[#e1b329] p-5 sm:p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3 border-b border-[#edd6bb]/30 dark:border-[#edd6bb]/20 pb-3">
              <div className="p-2.5 rounded-xl bg-[#e1b329]/20 text-[#e1b329]">
                <HelpCircle className="w-6 h-6 text-[#e1b329]" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-[#2c1d11] dark:text-[#edd6bb]">Drop Action Confirmation</h4>
                <p className="text-xs text-[#8a715e] dark:text-[#edd6bb]/70">Target &quot;{pendingDrop.targetName}&quot; is currently a primitive field.</p>
              </div>
            </div>

            <p className="text-xs text-[#2c1d11] dark:text-slate-200 leading-relaxed font-semibold">
              You dropped <strong className="text-[#b45309] dark:text-[#ffb443]">&quot;{pendingDrop.sourceName}&quot;</strong> onto primitive field <strong className="text-[#b45309] dark:text-[#ffb443]">&quot;{pendingDrop.targetName}&quot;</strong>. Choose an action:
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmConvert("object")}
                className="w-full py-2.5 px-3 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-md shadow-[#e1b329]/20 flex items-center justify-between transition-all"
              >
                <span>Convert &quot;{pendingDrop.targetName}&quot; to Nested Object</span>
                <Layers className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleConfirmConvert("array")}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md flex items-center justify-between transition-all"
              >
                <span>Convert &quot;{pendingDrop.targetName}&quot; to Array of Objects</span>
                <Plus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleConfirmReorder}
                className="w-full py-2.5 px-3 rounded-xl glass-panel text-[#2c1d11] dark:text-[#edd6bb] hover:bg-[#e1b329]/20 border border-[#edd6bb]/30 font-bold text-xs flex items-center justify-between transition-all"
              >
                <span>Reorder alongside &quot;{pendingDrop.targetName}&quot; (Same level)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setPendingDrop(null)}
                className="text-xs font-bold text-rose-500 hover:underline px-2 py-1"
              >
                Cancel Action
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
