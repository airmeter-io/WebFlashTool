import './App.css';

import React from 'react';
import {BuildManager, IPartitionResult,  IManifest } from './Business/BuildManager.ts'
import { Connect, IConnectionChangeInfo} from './Connect.tsx'
import { PartitionTable  } from './Business/PartitionTable.ts';
import { BoardManager } from './Business/BoardManager.ts';
import { BuildPartition } from './BuildPartition.tsx';
import { IManifestBuildPart } from './Business/BuildManager';
import {SuccessMessage} from './Messages/Success.tsx'
import {WarningMessage} from './Messages/Warning.tsx'
import {ErrorMessage} from './Messages/Error.tsx'



interface IBuildPartitionsProps {
    Build : BuildManager;
    Connection : IConnectionChangeInfo | null;
    PartitionTable : PartitionTable;
    OnEraseDevice: ()=>void;
}

enum BuildPartitionStage { Read, View, Flashing, Up2Date };

interface IBuildPartitionsState {
  stage : BuildPartitionStage;
  index : number;
  displayFlashButton : boolean;
  hideAllButtons : boolean;
}

class BuildPartitions extends React.Component<IBuildPartitionsProps, IBuildPartitionsState> {
  _refs : { [key: string]: React.RefObject<BuildPartition> } = {};
  _downloading : boolean = false;
  constructor(props) {
    super(props);
   
    
  }

  getRef(pPart : IManifestBuildPart) {
    if(this._refs[pPart.path]===undefined)
      this._refs[pPart.path] = React.createRef();
    return this._refs[pPart.path];
  }

  async updatePartitions() {
    if(this._downloading) return;
    this.setState(  { displayFlashButton: false, hideAllButtons: true });
    
    this._downloading = true;

    await this.delay(250);
    var needsFlash = false;
    for(var i =0; i <this.props.Build.Data.Manifest.builds[0].parts.length;i++)  {
       var ref =this.getRef(this.props.Build.Data.Manifest.builds[0].parts[i]);
       if(ref!==undefined && ref.current!==null) {
         var isUpToDate = await ref.current.downloadAndProcess();
         if(!isUpToDate)
           needsFlash = true;
       }
    }

    this.setState(  { displayFlashButton: needsFlash, hideAllButtons: false, stage: needsFlash? BuildPartitionStage.View: BuildPartitionStage.Up2Date });

  }

  async delay(ms: number) {
    await new Promise(resolve => setTimeout(()=>resolve(), ms)).then(()=>console.log("fired"));
}

async handleFlash() {

  this.setState(  { displayFlashButton: false, hideAllButtons: true });
  
  this._downloading = true;

  await this.delay(250);
 
  for(var i =0; i <this.props.Build.Data.Manifest.builds[0].parts.length;i++)  {
     var ref =this.getRef(this.props.Build.Data.Manifest.builds[0].parts[i]);
     if(ref!==undefined && ref.current!==null) {
       await ref.current.updateForFlash();
     }
  }
  var needsFlash = false;
  for(var i =0; i <this.props.Build.Data.Manifest.builds[0].parts.length;i++)  {
    var ref =this.getRef(this.props.Build.Data.Manifest.builds[0].parts[i]);
    if(ref!==undefined && ref.current!==null) {
      if(!await ref.current.flash())
        needsFlash = true;
    }
 }

 this.setState(  { displayFlashButton: needsFlash, hideAllButtons: false, stage: needsFlash? BuildPartitionStage.View: BuildPartitionStage.Up2Date });
}

async delay(ms: number) {
  await new Promise(resolve => setTimeout(()=>resolve(), ms)).then(()=>console.log("fired"));
}
  
  async componentDidUpdate(prevProps) {
    if (prevProps.Build.Name !== this.props.Build.Name) {
         this._downloading = false;
    }

    await this.updatePartitions();
  }

  async componentDidMount () {
    this.setState({ stage: BuildPartitionStage.Read, index: 0, displayFlashButton: false, hideAllButtons: false});
    if(this.props.Build!==null) {
      await this.updatePartitions();
    }
  }
  getReadableFileSizeString(fileSizeInBytes) {
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
      fileSizeInBytes /= 1024;
      i++;
    } while (fileSizeInBytes > 1024);
  
    return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
  }
  async componentWillUnmount () {
    
  }



  getStageMessage() {
    if(this.state===null) return (<div></div>);
    switch(this.state.stage) {
      case BuildPartitionStage.Read : 
        return (<WarningMessage Title="Reading device flash" Message="The flash of the device is being read and compared to the packages for the build. Please wait."/>);
      case BuildPartitionStage.View : 
        return (<ErrorMessage Title="Device is not up to date" Message="Your Airmeter.io device needs to be flashed to function correctly and benefit from the latest features/security enhancements."/>);
      case BuildPartitionStage.Flashing : 
        return (<WarningMessage Title="Flashing flash" Message="The device is being flashed. Please wait."/>);
      case BuildPartitionStage.Up2Date : 
        return (<SuccessMessage Title="Up to date" Message="This device is up to date."/>);

      }

  }

  eraseDevice(event) {
    event.preventDefault();
     this.props.OnEraseDevice();
  }

  configDevice(event) {
    event.preventDefault();

  }

  render() {
    return [
      (this.getStageMessage()),                 
      (
      <table className="partitions">
        <thead>
          <tr>
          <th className="partitionDataCol">Firmware Component</th>
          <th className="partitionDataCol">Offset</th>
          <th className="partitionDataCol">Binary Size</th>
          <th className="partitionStatus">Status</th>
          </tr>
        </thead>
        <tbody>
          { this.props.Build.Data.Manifest.builds[0].parts.map(item =>
                <BuildPartition Build={this.props.Build} 
                          ref={this.getRef(item)}
                          key = {item.path}
                          Connection={this.props.Connection} 
                          PartitionTable={this.props.PartitionTable}
                          Stage={this.state?.stage }
                          BuildPart={item}
                          BuildFile={this.props.Connection.device.Profile.applyToBuildFile(this.props.Build, this.props.Build.Data.getBuildFile(item.path))}/>)
         }
         
        </tbody>
      </table>),
      (this.state === null || this.state.hideAllButtons ? (<div className="flashActions"></div>) : (this.state.displayFlashButton ? 
        <div className="flashActions"><div className="secondaryBtn" onClick={this.eraseDevice.bind(this)}>Erase All</div><div onClick={this.handleFlash.bind(this)} className="primaryBtn">Flash</div></div> : 
        <div className="flashActions">
          <div className="primaryBtn" onClick={this.configDevice.bind(this)}>Configure</div>
          <div className="secondaryBtn" onClick={this.eraseDevice.bind(this)}>Erase All</div>
          </div>))];     
  }
}


export {BuildPartitions, BuildPartitionStage};
