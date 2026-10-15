export const developmentBranch = 'develop';
export const productionBranch = 'main';

export function branchRoute(branch) {
  if (branch === developmentBranch) return { kind: 'promotion', bases: [productionBranch] };
  if (/^hotfix\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch)) {
    return { kind: 'hotfix', bases: [productionBranch, developmentBranch] };
  }
  if (branch && branch !== productionBranch && branch !== 'HEAD') {
    return { kind: 'development', bases: [developmentBranch] };
  }
  return null;
}

export function validPullRoute(head, base) {
  return branchRoute(head)?.bases.includes(base) ?? false;
}
