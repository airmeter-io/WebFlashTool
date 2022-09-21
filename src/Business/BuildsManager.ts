import  {BuildManager} from './BuildManager.ts'
import { Board } from './BoardManager'


class BuildsManager {
    private _builds : BuildManager[];
    
    constructor() {        
        this._builds = [];        
    }     


    async getBuilds(pBoard : Board) {
       var result = await fetch("https://api.github.com/repos/airmeter-io/AirMeter.IO.Firmware/releases");
       var json  = await result.json();
       
       var resultArr : BuildManager[] = [];

     
       for(var buildIndex in json) {
          var build = json[buildIndex];

          for(var assetIndex in build.assets) {
            var asset = build.assets[assetIndex];
            if(pBoard.supportsBuild(asset)) 
              resultArr.push(new BuildManager(build,asset));
          }
       }
       return resultArr;
    }
  }
export default BuildsManager;