import type { WvEditProject, MediaAsset } from "../types/project";

/** objectUrl を除いてJSONにシリアライズする */
export function serializeProject(project: WvEditProject): string {
  const sanitized: WvEditProject = {
    ...project,
    assets: project.assets.map((a) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { objectUrl: _url, ...rest } = a;
      return rest as MediaAsset;
    }),
  };
  return JSON.stringify(sanitized, null, 2);
}

export function deserializeProject(json: string): WvEditProject {
  const data = JSON.parse(json) as WvEditProject;
  if (data.appName !== "wvEdit") throw new Error("無効なwvEditプロジェクトファイルです");
  return data;
}

export function downloadProjectFile(project: WvEditProject) {
  const json = serializeProject(project);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name}.wvedit.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function readProjectFile(file: File): Promise<WvEditProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = deserializeProject(e.target!.result as string);
        resolve(project);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsText(file);
  });
}
