import { SchemaField, ParentOption } from "./types";

/**
 * Builds standard JSON Schema / OpenAPI 3.0 object schema from recursive field list
 */
export function buildJsonSchema(fieldList: SchemaField[]): Record<string, any> {
  const properties: Record<string, any> = {};
  const requiredFields: string[] = [];

  fieldList.forEach((f) => {
    if (!f.name.trim()) return;
    if (f.required) requiredFields.push(f.name);

    if (f.type === "enum") {
      properties[f.name] = {
        type: "string",
        enum: f.enumValues ? f.enumValues.split(",").map((s) => s.trim()).filter(Boolean) : [],
        description: f.description || undefined,
      };
    } else if (f.type === "array") {
      if (f.arrayItemType === "object" && f.properties && f.properties.length > 0) {
        properties[f.name] = {
          type: "array",
          items: buildJsonSchema(f.properties),
          description: f.description || undefined,
        };
      } else {
        properties[f.name] = {
          type: "array",
          items: { type: f.arrayItemType || "string" },
          description: f.description || undefined,
        };
      }
    } else if (f.type === "object") {
      const childSchema = buildJsonSchema(f.properties || []);
      properties[f.name] = childSchema;
      if (f.description) properties[f.name].description = f.description;
    } else {
      properties[f.name] = {
        type: f.type,
        description: f.description || undefined,
      };
    }
  });

  return {
    type: "object",
    properties,
    ...(requiredFields.length > 0 ? { required: requiredFields } : {}),
  };
}

/**
 * Recursively collects all valid parent container fields (object or array of objects)
 * excluding the target field itself and any of its children.
 */
export function getAllParentOptions(
  fieldList: SchemaField[],
  excludeId?: string,
  currentDepth: number = 0
): ParentOption[] {
  const options: ParentOption[] = [];

  if (currentDepth === 0) {
    options.push({
      id: null,
      label: "🌐 Root Level (Top Hierarchy)",
      depth: 0,
      type: "object",
    });
  }

  const traverse = (items: SchemaField[], depth: number) => {
    for (const item of items) {
      if (item.id === excludeId) continue;

      const isContainer =
        item.type === "object" || (item.type === "array" && item.arrayItemType === "object");

      if (isContainer) {
        options.push({
          id: item.id,
          label: `${"  ".repeat(depth + 1)}📁 ${item.name || "unnamed"} (${item.type === "array" ? "Array Item Object" : "Object"})`,
          depth: depth + 1,
          type: item.type === "array" ? "array" : "object",
        });

        if (item.properties && item.properties.length > 0) {
          traverse(item.properties, depth + 1);
        }
      }
    }
  };

  traverse(fieldList, currentDepth);
  return options;
}

/**
 * Returns true if candidateChildId is equal to parentId OR is a nested descendant of parentId
 */
export function isDescendant(
  items: SchemaField[],
  candidateChildId: string,
  parentId: string
): boolean {
  const findParent = (list: SchemaField[]): SchemaField | null => {
    for (const item of list) {
      if (item.id === parentId) return item;
      if (item.properties && item.properties.length > 0) {
        const found = findParent(item.properties);
        if (found) return found;
      }
    }
    return null;
  };

  const parentNode = findParent(items);
  if (!parentNode) return false;

  const searchInNode = (node: SchemaField): boolean => {
    if (node.id === candidateChildId) return true;
    if (node.properties && node.properties.length > 0) {
      return node.properties.some(searchInNode);
    }
    return false;
  };

  return searchInNode(parentNode);
}

/**
 * Finds current parent ID and array index of a field anywhere in the tree
 */
export function findFieldParentAndIndex(
  tree: SchemaField[],
  fieldId: string
): { parentId: string | null; index: number } | null {
  const search = (
    items: SchemaField[],
    currParentId: string | null
  ): { parentId: string | null; index: number } | null => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === fieldId) {
        return { parentId: currParentId, index: i };
      }
      if (items[i].properties && items[i].properties!.length > 0) {
        const found = search(items[i].properties!, items[i].id);
        if (found) return found;
      }
    }
    return null;
  };
  return search(tree, null);
}

/**
 * Finds and removes a field with specified ID from anywhere in the field tree.
 * Returns tuple: [updatedFieldTree, extractedField]
 */
export function extractFieldFromTree(
  tree: SchemaField[],
  fieldId: string
): [SchemaField[], SchemaField | null] {
  let found: SchemaField | null = null;

  const removeRecursive = (items: SchemaField[]): SchemaField[] => {
    const result: SchemaField[] = [];
    for (const item of items) {
      if (item.id === fieldId) {
        found = { ...item };
      } else {
        const updatedItem = { ...item };
        if (updatedItem.properties) {
          updatedItem.properties = removeRecursive(updatedItem.properties);
        }
        result.push(updatedItem);
      }
    }
    return result;
  };

  const newTree = removeRecursive(tree);
  return [newTree, found];
}

/**
 * Reparents a field to a new parent target ID (null for Root level).
 */
export function reparentField(
  tree: SchemaField[],
  fieldId: string,
  targetParentId: string | null
): SchemaField[] {
  if (!fieldId) return tree;
  if (targetParentId === fieldId) return tree;
  if (targetParentId !== null && isDescendant(tree, targetParentId, fieldId)) {
    return tree; // Prevent cyclic nesting!
  }

  const [cleanedTree, fieldToMove] = extractFieldFromTree(tree, fieldId);
  if (!fieldToMove) return tree;

  if (targetParentId === null) {
    return [...cleanedTree, fieldToMove];
  }

  const insertRecursive = (items: SchemaField[]): SchemaField[] => {
    return items.map((item) => {
      if (item.id === targetParentId) {
        const props = item.properties ? [...item.properties] : [];
        return {
          ...item,
          type: item.type === "array" ? "array" : "object",
          arrayItemType: item.type === "array" ? "object" : item.arrayItemType,
          properties: [...props, fieldToMove],
        };
      }
      if (item.properties) {
        return {
          ...item,
          properties: insertRecursive(item.properties),
        };
      }
      return item;
    });
  };

  return insertRecursive(cleanedTree);
}

/**
 * Removes fieldId from anywhere in the tree, and inserts it into targetParentId at specific insertIndex.
 */
export function insertFieldAtPosition(
  tree: SchemaField[],
  fieldId: string,
  targetParentId: string | null,
  insertIndex: number
): SchemaField[] {
  if (!fieldId) return tree;
  if (targetParentId === fieldId) return tree;
  if (targetParentId !== null && isDescendant(tree, targetParentId, fieldId)) {
    return tree; // Prevent cyclic nesting!
  }

  const sourceLoc = findFieldParentAndIndex(tree, fieldId);
  if (!sourceLoc) return tree;

  let adjustedIndex = insertIndex;
  if (sourceLoc.parentId === targetParentId && sourceLoc.index < insertIndex) {
    adjustedIndex = insertIndex - 1;
  }

  const [cleanedTree, fieldToMove] = extractFieldFromTree(tree, fieldId);
  if (!fieldToMove) return tree;

  if (targetParentId === null) {
    const nextTree = [...cleanedTree];
    const safeIndex = Math.min(Math.max(0, adjustedIndex), nextTree.length);
    nextTree.splice(safeIndex, 0, fieldToMove);
    return nextTree;
  }

  const insertRecursive = (items: SchemaField[]): SchemaField[] => {
    return items.map((item) => {
      if (item.id === targetParentId) {
        const props = item.properties ? [...item.properties] : [];
        const safeIndex = Math.min(Math.max(0, adjustedIndex), props.length);
        props.splice(safeIndex, 0, fieldToMove);
        return {
          ...item,
          type: item.type === "array" ? "array" : "object",
          arrayItemType: item.type === "array" ? "object" : item.arrayItemType,
          properties: props,
        };
      }
      if (item.properties) {
        return {
          ...item,
          properties: insertRecursive(item.properties),
        };
      }
      return item;
    });
  };

  return insertRecursive(cleanedTree);
}

/**
 * Converts a non-container target field into object/array container and moves sourceField into it
 */
export function convertAndReparentField(
  tree: SchemaField[],
  sourceId: string,
  targetId: string,
  containerType: "object" | "array"
): SchemaField[] {
  if (!sourceId || !targetId || sourceId === targetId) return tree;
  if (isDescendant(tree, targetId, sourceId)) return tree;

  const [cleanedTree, fieldToMove] = extractFieldFromTree(tree, sourceId);
  if (!fieldToMove) return tree;

  const convertRecursive = (items: SchemaField[]): SchemaField[] => {
    return items.map((item) => {
      if (item.id === targetId) {
        const existingProps = item.properties ? [...item.properties] : [];
        if (containerType === "object") {
          return {
            ...item,
            type: "object",
            properties: [...existingProps, fieldToMove],
          };
        } else {
          return {
            ...item,
            type: "array",
            arrayItemType: "object",
            properties: [...existingProps, fieldToMove],
          };
        }
      }
      if (item.properties) {
        return {
          ...item,
          properties: convertRecursive(item.properties),
        };
      }
      return item;
    });
  };

  return convertRecursive(cleanedTree);
}

/**
 * Updates a specific field anywhere in the tree with patch properties
 */
export function updateFieldInTree(
  tree: SchemaField[],
  fieldId: string,
  patch: Partial<SchemaField>
): SchemaField[] {
  return tree.map((item) => {
    if (item.id === fieldId) {
      return { ...item, ...patch };
    }
    if (item.properties) {
      return {
        ...item,
        properties: updateFieldInTree(item.properties, fieldId, patch),
      };
    }
    return item;
  });
}

/**
 * Deletes a field anywhere in the tree
 */
export function deleteFieldFromTree(
  tree: SchemaField[],
  fieldId: string
): SchemaField[] {
  const [cleanedTree] = extractFieldFromTree(tree, fieldId);
  return cleanedTree;
}
