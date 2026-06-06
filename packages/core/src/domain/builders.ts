export interface CreatePrParams {
  title: string;
  sourceBranch: string;
  targetBranch: string;
  description: string;
  draft: boolean;
  assignees: string[];
  labels: string[];
}

export class CreatePrBuilder {
  private _title = "";
  private _sourceBranch = "";
  private _targetBranch = "";
  private _description = "";
  private _draft = false;
  private _assignees: string[] = [];
  private _labels: string[] = [];

  title(t: string)          { this._title = t; return this; }
  source(branch: string)    { this._sourceBranch = branch; return this; }
  target(branch: string)    { this._targetBranch = branch; return this; }
  description(d: string)    { this._description = d; return this; }
  asDraft()                 { this._draft = true; return this; }
  assignees(users: string[]) { this._assignees = users; return this; }
  labels(l: string[])       { this._labels = l; return this; }

  build(): CreatePrParams {
    if (!this._title) throw new Error("PR title is required");
    if (!this._sourceBranch) throw new Error("Source branch is required");
    if (!this._targetBranch) throw new Error("Target branch is required");
    return {
      title: this._title,
      sourceBranch: this._sourceBranch,
      targetBranch: this._targetBranch,
      description: this._description,
      draft: this._draft,
      assignees: this._assignees,
      labels: this._labels,
    };
  }
}

export interface CreateIssueParams {
  title: string;
  description: string;
  labels: string[];
  assignees: string[];
}

export class CreateIssueBuilder {
  private _title = "";
  private _description = "";
  private _labels: string[] = [];
  private _assignees: string[] = [];

  title(t: string)           { this._title = t; return this; }
  description(d: string)     { this._description = d; return this; }
  addLabel(label: string)    { this._labels.push(label); return this; }
  labels(l: string[])        { this._labels = l; return this; }
  assignees(users: string[]) { this._assignees = users; return this; }

  build(): CreateIssueParams {
    if (!this._title) throw new Error("Issue title is required");
    return {
      title: this._title,
      description: this._description,
      labels: this._labels,
      assignees: this._assignees,
    };
  }
}
