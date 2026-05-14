export interface RawMenuTreeNode {
  id: number
  label?: string
  title?: string
  key?: string
  i18nKey?: string
  children?: RawMenuTreeNode[]
}

export interface MenuTreeNode {
  id: number
  label: string
  i18nKey?: string
  children?: MenuTreeNode[]
}

function pickNodeLabel(node: RawMenuTreeNode): string {
  return node.label || node.title || node.key || String(node.id)
}

export function normalizeMenuTree(nodes: RawMenuTreeNode[] = []): MenuTreeNode[] {
  return nodes.map((node) => ({
    id: node.id,
    label: pickNodeLabel(node),
    i18nKey: node.i18nKey,
    children: node.children?.length ? normalizeMenuTree(node.children) : undefined,
  }))
}
