import './App.css';

import React from 'react';
import {BuildManager, BuildData, IPartitionResult} from './Business/BuildManager.ts'
import {SuccessMessage} from './Messages/Success.tsx'
import {WarningMessage} from './Messages/Warning.tsx'
import {ErrorMessage} from './Messages/Error.tsx'
import { Connect, IConnectionChangeInfo} from './Connect.tsx'
import { PartitionTable  } from './Business/PartitionTable.ts';
import { BoardManager } from './Business/BoardManager.ts';
import { BuildPartitions } from './BuildPartitions.tsx';
import { SpiffsFile, SpiffsFsReader, SpiffsFsWriter, ISpiffsConfig } from './Business/SpiffsFs.ts'

interface IBuildProps {
    Build : BuildManager;
    Connection : IConnectionChangeInfo | null;
}

interface IBuildState {
  downloaded: number;
  message : string;
  failed: boolean;
  requiresClean : boolean;
  currentPartitionTable : PartitionTable | null ;
  buildPartition : IPartitionResult | null;
  buildPartitionTable : PartitionTable | null;
  durl : string ;
}

class Build extends React.Component<IBuildProps, IBuildState> {
  private _hasDownloaded = false;
  private _currentPartitionTableBlock  : Int8Array;

  private _boards : BoardManager
  constructor(props) {
    super(props);
   
    this._boards = new BoardManager();
  }

  update(pMessage, pDownloaded) {
    this.setState({ 
      downloaded: pDownloaded,
      message: pMessage      
   });
  }

  failed(pMessage) {
    this.setState({ 
      failed: true,
      message: pMessage
   });
  }


  async delay(ms: number) {
    await new Promise(resolve => setTimeout(()=>resolve(), ms)).then(()=>console.log("fired"));
}

  async warpSpiffs(pBuild : BuildData) {
    var file = pBuild.getBuildFile("dev.bin");


    var dat = new Uint8Array(file.data);
    var spiffsConfig : ISpiffsConfig = {
      blockSize: 4096,
      pageSize: 256,
      objectNameLength: 32, 
      metaLength: 4, 
      useMagicLength : true
    };
    var rea= new SpiffsFsReader(spiffsConfig);
    var files2 = rea.getFiles(dat);
    files2.forEach(pFile => {
      console.log(pFile.Name);
      if(pFile.Name.endsWith("bundle.js.gz")) {
        var p = new TextDecoder().decode(pFile.Data);
        console.log(p);
        // const blob = new Blob( [ pFile.Data ], { type: 'application/octet-stream' } );	
        // const objectURL = URL.createObjectURL( blob );
        // this.setState({ 
        //   durl: objectURL
        // });    
      }                  
    });

    var writer = new SpiffsFsWriter(spiffsConfig);
    writer.writeFiles(dat, files2);
    const blob = new Blob( [ dat ], { type: 'application/octet-stream' } );	
    const objectURL = URL.createObjectURL( blob );
    this.setState({ 
      durl: objectURL
    });      
  }

  async startDownload() {
    
    if(!this._hasDownloaded) {
      this._hasDownloaded = true;
      var buildPartition : IPartitionResult | null = null;
      await this.delay(250);      
      try {
        await this.props.Build.download(this.update.bind(this));

        await this.warpSpiffs(this.props.Build.Data);
      } catch(exception) {
        this.failed("Failed to download build");
        return;
      }
      try {
        var board = this._boards.getBoard(this.props.Connection.info)
        this.update("Downloading flash block",0);
        this._currentPartitionTableBlock = await this.props.Connection.connection.readFlash(
          board.PartitionTableOffset,
          board.PartitionTableSize,
          donePercent=> {});

        // this._currentPartitionTableBlock = await this.props.Connection.connection.readFlash(
        //   0x1000,
        //   0x7000,
        //   donePercent=> {});
        buildPartition =  this.props.Build.Data.getPartition(board.PartitionTableOffset);

        this.setState({ buildPartition: buildPartition, buildPartitionTable: new PartitionTable(buildPartition.File.data)});
        
       
      } catch(exception) {
        this.failed("Failed to read partition table from device.");
        return;
      }

      try {
        this.setState({ currentPartitionTable:new PartitionTable(this._currentPartitionTableBlock) });


       
      } catch(exception) {        
      }

      this.update("Downloaded and parsed current partition table",100);      
      
      // if(!(this._currentPartitionTableBlock.length === buildPartition.File.data.length && this._currentPartitionTableBlock.every((value, index) => value === buildPartition.File.data[index]))) {
      //    this.setState({
      //       requiresClean: true
      //    });
      // }
    }
  }
  async componentDidUpdate(prevProps) {
    if (prevProps.Build.Name !== this.props.Build.Name) {
    
      this._hasDownloaded = false;
      this.setState( { failed: false, requiresClean: false });
      this.startDownload();
    }
  }

  async componentDidMount () {

    if(this.props.Build!==null) {
      this.startDownload();
     }
  }

  async componentWillUnmount () {
    
  }
  render() {
    if(this.state === null) return (<div></div>);

    if(this.state.failed) {
      return (<ErrorMessage Title="Failed to download" Message={ this.state.message }/>);
    }
    if(this.state.downloaded === 100){
      if(!this.state.requiresClean) {
        return (
          <div>
            <a href={this.state.durl}>Download warped</a>
            <BuildPartitions Build={this.props.Build} Connection={this.props.Connection} PartitionTable={this.state.buildPartitionTable}/>

          </div>
        );
      } else {
        return (
          <div>
            <SuccessMessage Title="Downloaded" Message="The build has been downloaded"/>  
            <p>The partition table of this device does not match that of the build. Therefore the flash must be erased before proceeding.</p>
          </div>
        );
      }
    }
    return (

      <WarningMessage Title="Downloading..." Message={ this.state.message }/>
     
    );
  }
}


export default Build;
