# Release

1. Update version in package.json
1. Update tag version in `yarn add` and `npm i` commands in the README
1. Open PR
1. Get PR merged
1. Pull master, tag master with your new version `git tag v0.1.0-beta.1`
1. Push tags `git push origin --tags`

For now, users can install from Github. When this gets further along
and closer to non-beta release then we will release to NPM
