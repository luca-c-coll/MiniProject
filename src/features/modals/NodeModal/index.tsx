import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  ScrollArea,
  Flex,
  CloseButton,
  Button,
  Textarea,
  Group,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const setSelectedNode = useGraph(state => state.setSelectedNode);
  const getJson = useJson(state => state.getJson);
  const setJson = useJson(state => state.setJson);

  const [editing, setEditing] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState<string>("{}");

  React.useEffect(() => {
    // reset editing state when node changes or modal opened/closed
    setEditing(false);
    setEditedContent(normalizeNodeData(nodeData?.text ?? []));
  }, [nodeData, opened]);

  const handleEdit = () => {
    setEditedContent(normalizeNodeData(nodeData?.text ?? []));
    setEditing(true);
  };

  const setValueAtPath = (obj: any, path: NodeData["path"] | undefined, value: any) => {
    if (!path || path.length === 0) return value;
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };
    let cur: any = copy;
    for (let i = 0; i < path.length - 1; i++) {
      const seg = path[i] as any;
      if (typeof seg === "number") {
        cur[seg] = cur[seg] ?? {};
      } else {
        cur[seg] = cur[seg] ?? {};
      }
      cur = cur[seg];
    }
    const last = path[path.length - 1] as any;
    cur[last] = value;
    return copy;
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editedContent);
      const wholeJsonStr = getJson();
      const wholeObj = wholeJsonStr ? JSON.parse(wholeJsonStr) : {};
      const newObj = setValueAtPath(wholeObj, nodeData?.path, parsed);
      const newJsonStr = JSON.stringify(newObj, null, 2);
      setJson(newJsonStr);

      // Update selected node content in UI immediately
      if (nodeData && setSelectedNode) {
        const newText: NodeData['text'] = [];
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          Object.keys(parsed).forEach(k => {
            newText.push({ key: k, value: parsed[k], type: typeof parsed[k] as any });
          });
        } else {
          newText.push({ key: null, value: parsed, type: typeof parsed as any });
        }
        setSelectedNode({ ...nodeData, text: newText });
      }

      setEditing(false);
    } catch (err) {
      // parsing failed
      // show basic alert for now
      // eslint-disable-next-line no-alert
      alert("Invalid JSON: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditedContent(normalizeNodeData(nodeData?.text ?? []));
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Group spacing="xs">
              {!editing && (
                <Button size="xs" variant="default" onClick={handleEdit}>
                  Edit
                </Button>
              )}
              {editing && (
                <>
                  <Button size="xs" color="green" onClick={handleSave}>
                    Save
                  </Button>
                  <Button size="xs" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              )}
              <CloseButton onClick={onClose} />
            </Group>
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {editing ? (
              <Textarea
                minRows={4}
                maw={600}
                miw={350}
                value={editedContent}
                onChange={e => setEditedContent(e.currentTarget.value)}
                styles={{ input: { fontFamily: "monospace" } }}
              />
            ) : (
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
