const apiUrl = "https://dendro.vercel.app";

export const apiPostDendroRequest = async (
  path: string,
  req: any,
  accessToken?: string,
) => {
  const url = `${apiUrl}/api/${path}`;
  const headers: { [key: string]: string } = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  headers["Content-Type"] = "application/json";
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    const responseText = await response.text();
    throw Error(`Error fetching ${path}: ${response.status} ${responseText}`);
  }
  const resp = await response.json();
  return resp;
};
