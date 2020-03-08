# Mux Data JavaScript Integration Framework

This repo is a scaffold to be used to create custom integrations for JavaScript-based players. See [Building a Custom JavaScript Integration](https://docs.mux.com/docs/javascript-building-a-custom-integration) for more specific details on building the integration.

## Using

First off, fork this repo and rename it to something like `playerName-mux`, replacing `playerName` with the name of your player. You will use this name in a few of the files that you need to modify to create a working integration.

Next, install dependencies:

`yarn install`

The last step (of course, the largest) is modifying some files to actually create the integration.

### Package Structure

The layout of this application is as follows:

- `webpack.config.js` - core webpack configuration for building the library
- `webpack.dev.js` - development webpack config for active development
- `webpack.prod.js` - production build configuration
- `index.html` - scaffold HTML page for base player testing
- `ads.html` - scaffold HTML page for testing players with advertisements
- `/src` - core library code
  - `entry.js` - entrypoint for webpack, to be able to support the built library directly in browsers and via NPM if desired.
 - `index.js` - the main library file (most of the work will be in here)
- `scripts` - scripts to help manage deployment
  - `banner.ejs` - template for banner at top of output file
  - `deploy.js` - controls the automated deploy; can be ignored if you want to build this yourself only
- `Dockerfile` - used in automated build/deploy process; there should be no need to modify this file

### Modify the files

There are a few simple changes that need to be made (in a future version, we hope to have a generator to do this work automatically):

1. In `ads.html` and `index.html` replace `yourPlayer` within `initYourPlayerMux` and `yourPlayer-mux.js` with the name of your player (i.e. `videojs`).
2. In `package.json` replace `yourPlayer` within `yourPlayer-mux.js` with the name of your player (as in step 1).
3. In `scripts/deploy.js` replace `yourPlayer` with the name of your player.
4. In `webpack.config.js` replace `yourPlayer` within `initYourPlayerMux` and `yourPlayer-mux.js` with the name of your player (as in step 1).

Next, you will want to modify `src/index.js`, which is where the bulk of the code will live, with the following steps. In general, there are comments within this file around each code block to tell you what each section should do; they should provide some guidance. However, the main steps are the following:

1. Replace all references to `yourPlayer` with the name of your player (to match what you did in the above files).
2. Implement the `options.getPlayheadTime` callback to retrieve the current playhead time in milliseconds.
3. Implement the `options.getStateData` callback to retrieve the current state of the player, including all properties that can be retrieved.
4. Implement all of the events as laid out in the file. Each comment should describe when you should emit each event, via `player.mux.emit`, which is defined as a helper method near the top of the file.

For steps 2, 3, and 4, make sure to follow the documentation within [Building a Custom JavaScript Integration](https://docs.mux.com/docs/javascript-building-a-custom-integration), as more detail and suggestions are provided there.

## Testing 

Once you want to test this out, you will need to provide a simple HTML page (in index.html or ads.html) with a sample player and calling the `initYourPlayerMux` method, passing the player reference to it.

There is a script defined in `package.json` that will run webpack-dev-server to compile and load the script into the pages. Just run 

`yarn start`

and you can then test out:

* http://localhost:8080/index.html
* http://localhost:8080/ads.html

The samples include the `debug: true` value in the options passed to the SDK, which will cause the underlying Mux SDK to log debug information, such as events that are sent (or would have been sent if something had gone wrong).

webpack-dev-server will automatically reload and rebuild the plugin when changes are made to `index.js`.

## Building

Within `package.json`, there is a target to package everything up for hosting/deploying. You can run this via

`yarn run package`

When you do this, it will run a linter automatically, and package everything up so that you should be able to include this within a normal `<script>` tag.
