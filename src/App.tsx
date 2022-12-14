import React, { ChangeEventHandler, useEffect, useState } from "react";
import "./App.css";

import { Octokit } from "octokit";
import { Endpoints } from "@octokit/types";

const OWNER = "<PUT_YOUR_GITHUB_USER_NAME_HERE>";
const ACCESS_TOKEN = "<PUT_YOUR_ACCESS_TOKEN_HERE>"

const octokitAuth: Octokit = new Octokit({
  auth: ACCESS_TOKEN,
});

const ListRepos: React.FC<{
  selected: string;
  onChange: ChangeEventHandler<HTMLSelectElement> | undefined;
}> = ({ selected, onChange: handleRepoSelect }) => {
  type listUserReposResponse =
    Endpoints["GET /repos/{owner}/{repo}"]["response"];

  const [data, setData] = useState<listUserReposResponse["data"][] | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const response = await octokitAuth.request(
          "GET /user/repos{?visibility,affiliation,type,sort,direction,per_page,page,since,before}",
          {}
        );
        setData(response.data);
      } catch (error) {
        setError(error as Error | undefined);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  let options;

  if (error) {
    options = <option>`An error occurred: ${error?.message}`</option>;
  } else if (isLoading) {
    options = isLoading && <option>Loading...</option>;
  } else {
    options = data?.map((repo) => (
      <option key={repo.id} value={repo.name}>
        {repo.name}
      </option>
    ));
  }

  return (
    <>
      <label>Select a repo</label>
      <select value={selected} onChange={handleRepoSelect}>
        <option value="" disabled>
          Choose a Repo
        </option>
        {options}
      </select>
    </>
  );
};

const ListBranches: React.FC<{
  repo: string;
  selected: string;
  onChange: ChangeEventHandler<HTMLSelectElement> | undefined;
}> = ({ repo = "", selected = "", onChange: handleBranchSelect }) => {
  type listUserBranchesResponse =
    Endpoints["GET /repos/{owner}/{repo}/branches"]["response"];

  const [data, setData] = useState<
    listUserBranchesResponse["data"] | undefined
  >(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const response = await octokitAuth.request(
          "GET /repos/{owner}/{repo}/branches{?protected,per_page,page}",
          {
            owner: OWNER,
            repo: repo,
          }
        );
        setData(response.data);
      } catch (error) {
        setError(error as Error | undefined);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [repo]);

  let options;

  if (error) {
    options = <option>`An error occurred: ${error?.message}`</option>;
  } else if (isLoading) {
    options = isLoading && <option>"Loading...</option>;
  } else {
    options = data?.map((branch) => (
      <>
        <option key={branch.commit.sha} value={branch.name}>
          {branch.name}
        </option>
      </>
    ));
  }

  return (
    <>
      <label>Select a branch</label>

      <select value={selected} onChange={handleBranchSelect}>
        <option value="" disabled>
          Choose a Branch
        </option>
        {options}
      </select>
    </>
  );
};

const Lists: React.FC = () => {
  const [selectedRepoName, setSeletedRepoName] = useState<string>("");

  const [selectedBranchName, setSeletedBranchName] = useState<string>("");

  const handleRepoSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSeletedRepoName(event.currentTarget.value);
  };

  type createBlobResponse =
    Endpoints["POST /repos/{owner}/{repo}/git/blobs"]["response"];

  type createTreeResponse =
    Endpoints["POST /repos/{owner}/{repo}/git/trees"]["response"];

  type creatCommitResponse =
    Endpoints["POST /repos/{owner}/{repo}/git/commits"]["response"];

  type getPulledCommitResponse =
    Endpoints["GET /repos/{owner}/{repo}/git/commits/{commit_sha}"]["response"];

  type createDraftPRResponse =
    Endpoints["POST /repos/{owner}/{repo}/pulls"]["response"];

  type createNewBranchResponse =
    Endpoints["POST /repos/{owner}/{repo}/git/refs"]["response"];

  const [blob, setBlob] = useState<createBlobResponse | undefined>(undefined);
  const [tree, setTree] = useState<createTreeResponse | undefined>(undefined);
  const [commit, setCommit] = useState<creatCommitResponse | undefined>(
    undefined
  );
  const [newBranch, setNewBranch] = useState<
    createNewBranchResponse | undefined
  >(undefined);

  const [pulledCommit, setPulledCommit] = useState<
    getPulledCommitResponse | undefined
  >(undefined);

  const [draftPr, setDraftPr] = useState<createDraftPRResponse | undefined>(
    undefined
  );

  const handleBranchSelect = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const branchName = event.currentTarget.value;

    setSeletedBranchName(branchName);
  };

  const handleSubmit = async () => {
    const responseBlob = await octokitAuth.request(
      "POST /repos/{owner}/{repo}/git/blobs",
      {
        owner: OWNER,
        repo: selectedRepoName,
        content: "Content of the blob here, its amazing...",
        encoding: "utf-8",
      }
    );
    setBlob(responseBlob);

    // get a branche's specific info
    const branch = await octokitAuth.request(
      "GET /repos/{owner}/{repo}/branches/{branch}",
      {
        owner: OWNER,
        repo: selectedRepoName,
        branch: "main",
      }
    );

    // create a new tree with the file contents
    const responseTree = await octokitAuth.request(
      "POST /repos/{owner}/{repo}/git/trees",
      {
        owner: OWNER,
        repo: selectedRepoName,
        tree: [
          {
            path: "newFileYey.rb",
            mode: "100644",
            type: "blob",
            sha: responseBlob.data.sha,
          },
        ],
        base_tree: branch.data.commit.commit.tree.sha,
      }
    );
    setTree(responseTree);

    // create a commit
    const responseCommit = await octokitAuth.request(
      "POST /repos/{owner}/{repo}/git/commits",
      {
        owner: OWNER,
        repo: selectedRepoName,
        message: "my commit message",
        author: {
          name: OWNER,
          email: "tim@github.com",
        },
        parents: [branch.data.commit.sha], // this thing...
        tree: responseTree.data.sha,
      }
    );
    setCommit(responseCommit);

    // get the created a commit
    const responsePulledCommit = await octokitAuth.request(
      "GET /repos/{owner}/{repo}/git/commits/{commit_sha}",
      {
        owner: OWNER,
        repo: selectedRepoName,
        commit_sha: responseCommit.data.sha,
      }
    );
    setPulledCommit(responsePulledCommit);

    (async () => {
      const newBranchResponse = await octokitAuth.request(
        "POST /repos/{owner}/{repo}/git/refs",
        {
          owner: OWNER,
          repo: selectedRepoName,
          ref: `refs/heads/${newBranchName}`,
          sha: responseCommit.data.sha,
        }
      );
      setNewBranch(newBranchResponse);
    })();

    // create a draft PR
    (async () => {
      const response = await octokitAuth.request(
        "POST /repos/{owner}/{repo}/pulls",
        {
          owner: OWNER,
          repo: selectedRepoName,
          title: "Amazing new feature",
          body: "Please pull these awesome changes in!",
          head: newBranchName,
          base: "main",
          // draft: true
        }
      );
      setDraftPr(response);
    })();
  };

  const [newBranchName, setNewBranchName] = useState<string>("");
  const handleNewBranchName = (event: HTMLInputElement) => {
    console.log(event);
    
    setNewBranchName(event.value);
  };

  return (
    <>
      <h1>Select a Repositories</h1>
      <p>
        <ListRepos selected={selectedRepoName} onChange={handleRepoSelect} />
      </p>
      {selectedRepoName && (
        <>
          <h1>Select a branch to use as a base</h1>
          <p>
            <ListBranches
              repo={selectedRepoName}
              selected={selectedBranchName}
              onChange={handleBranchSelect}
            />
          </p>
        </>
      )}
      {selectedBranchName && (
        <>
          <h1>Create a new branch with the following name</h1>
          <p>
            <input
              name="newBranchName"
              value={newBranchName}
              onChange={(event) => handleNewBranchName(event.target)}
            />
          </p>
        </>
      )}
      <p>
        <button
          type="submit"
          disabled={!selectedBranchName}
          onClick={handleSubmit}
        >
          Submit
        </button>
      </p>
      {blob && (
        <>
          <h1>The created blob</h1>
          <p>
            <code>{JSON.stringify(blob, null, 2)}</code>
          </p>
        </>
      )}
      {tree && (
        <>
          <h1>The created tree</h1>
          <p>
            <code>{JSON.stringify(tree, null, 2)}</code>
          </p>
        </>
      )}      
      {commit && (
        <>
          <h1>The created commit</h1>
          <p>
            <code>{JSON.stringify(commit, null, 2)}</code>
          </p>
        </>
      )}
      {pulledCommit && (
        <>
          <h1>The pulled commit</h1>
          <p>
            <code>{JSON.stringify(pulledCommit, null, 2)}</code>
          </p>
        </>
      )}
      {newBranch && (
        <>
          <h1>The new branch</h1>
          <p>
            <code>{JSON.stringify(newBranch, null, 2)}</code>
          </p>
        </>
      )}
      {draftPr && (
        <>
          <h1>The pull request</h1>
          <p>
            <code>{JSON.stringify(draftPr, null, 2)}</code>
          </p>
        </>
      )}
    </>
  );
};

function App() {
  return (
    <div className="App">
      <Lists />
      <header className="App-header"></header>
    </div>
  );
}

export default App;
