import './App.css';


import React from 'react';
import {BoardManager} from './Business/BoardManager.ts';
import {BuildManager} from './Business/BuildManager.ts'
import BuildsManager from './Business/BuildsManager.ts'
import Build from './Build.tsx'
import {DropDown} from "./form/DropDown.tsx"
import { IConnectionInfo } from './Business/ConnectionManager';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface IBuildsAvailableProps {
  ConnectionInfo : IConnectionInfo | null;
  OnBuildChanged : (BuildManager)=>void 
}

interface IBuildsAvailableState {
  supported: boolean;
  builds: BuildManager[];
  build: string;
  selectedBuild: BuildManager | null;
}

class BuildsAvailable extends React.Component<IBuildsAvailableProps,IBuildsAvailableState > {
  _boards : BoardManager;
  _builds : BuildsManager;
  _defBuild : string | null;
  _ref : React.RefObject<HTMLSelectElement>;
  constructor(props) {
    super(props);
    this._ref = React.createRef();
    this._boards = new BoardManager();
    this._builds = new BuildsManager();
    this.state = {  supported: false, builds: [], build: "", selectedBuild: null };
  }

  getValue() {
    return this._ref.current==null? null :  this._ref.current.value;
  }

  async updateBuilds() {
    if(!this._boards.isBoardSupported(this.props.ConnectionInfo)) {
      this.setState({
       supported: false, 
       builds: [],
       build: "",
       selectedBuild: null
       });
       return;
     }
 
      var board = this._boards.getBoard(this.props.ConnectionInfo)
      var builds = await this._builds.getBuilds(board);
      var selected = builds.length>0 ? builds[0].name : null;
      var selBuild = builds.length>0 ? builds[0] : null;
      this._defBuild = selected;
      this.setState({ 
        supported: true,
        builds: builds,
        build: selected,
        selectedBuild: selBuild
      });
      this.props.OnBuildChanged(selBuild);
  }

  async componentDidUpdate(prevProps) {
    if (prevProps.ConnectionInfo !== this.props.ConnectionInfo) {
       this.updateBuilds();
    }
  }

  async componentDidMount () {
    this.updateBuilds();
  }

  async componentWillUnmount () {
 
  }

  async setBuild() {
    var buildName = this.getValue();
    this.state.builds.forEach(build=>{
      if(build.Name ===buildName)
      {
        this._defBuild = buildName;
       
       // this.setState( { build: pBuildName});
        this.props.OnBuildChanged(build);
      }
    })
  }

  render() {
    if(this.props.ConnectionInfo==null)
      return(<div></div>);

    if(!this.state.supported) {
      return (
        <div>Unsupported Board</div>
      );
    }
    return (
      <div>
         <select ref={this._ref}  className="w3-select" value={this.state.build}  onChange={this.setBuild.bind(this)}>
            {this.state.builds.map(item =><option value={item.Name} key={item.Name}>{item.Name}</option>)}
            
          </select>  
        {/* <DropDown Label="Release" Value={this.state.build} OnChange={this.setBuild.bind(this)} OnSave={pValue=>{}}>
          {this.state.builds.map(item =><option value={item.Name} key={item.Name}>{item.Name}</option>)}
        </DropDown>                 */}
      </div>
    );
  }
}


export {BuildsAvailable};
