# 1. Be sure your changes are committed and pushed first
git add .
git commit -m "docs: create clearer API documentation"
git push

# 2. Create the tag (ensure this matches the version in package.json)
git tag v1.0.10

# 3. Push the tag to trigger the GitHub Action
git push origin v1.0.10