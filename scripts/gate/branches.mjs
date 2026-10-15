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

// A previous promotion adds a merge commit only to main. The next promotion
// can use develop directly when Git's merge result contains exactly its tree.
export function promotionMergeProblem(git, main, develop) {
  try {
    const result = git(['merge-tree', '--write-tree', main, develop]);
    const mergedTree = result.split('\n')[0];
    const developTree = git(['rev-parse', `${develop}^{tree}`]);
    if (mergedTree === developTree) return null;
    return 'Main has content missing from develop. Merge main into develop before promotion.';
  } catch {
    return 'Cannot safely merge main into develop. Fetch both branches and resolve any merge conflict before promotion.';
  }
}
