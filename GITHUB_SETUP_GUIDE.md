# Setting Up GitHub Actions Sync

Your workspace has been prepared with a clean Git history and a Serverless Cron script! 
Here is how to upload it to GitHub and configure the Neon database connection.

## 1. Push to a new GitHub Repository

Since we completely wiped the Git history to guarantee no past `.env` files are hiding in your commits, you must force push this to GitHub.

1. If you haven't already, log into GitHub and create a new **Public** Repository.
2. In your local terminal, run the following commands (replace `YOUR_GITHUB_USERNAME` and `YOUR_REPO_NAME`):

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u --force origin main
```

*(Note: The `--force` flag is required because we wiped the history locally, and GitHub needs to overwrite whatever is currently there).*

## 2. Add the Neon DB Secret

For the GitHub Action to connect to your database, it needs the `DATABASE_URL` environment variable. Since the repo is public, **never hardcode this anywhere**.

1. Go to your repository on GitHub.
2. Click on **Settings** (the gear icon on the top right of the repo).
3. In the left sidebar, expand **Secrets and variables** and click **Actions**.
4. Click the green **New repository secret** button.
5. Set the **Name** to: `DATABASE_URL`
6. Set the **Secret** to: `your_neon_db_connection_string`
7. Click **Add secret**.

## 3. Verify it Works!

1. Go to the **Actions** tab in your GitHub repository.
2. You will see a workflow named "Background Sync".
3. It will automatically run every 14 minutes.
4. You can also click on it and press **Run workflow** to test it immediately!
