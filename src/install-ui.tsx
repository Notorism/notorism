import React,{useState,useEffect} from 'react';
import {Box,Text,useInput,useApp,useStdout} from 'ink';
import {install,resolveTargets,type Agent,type InstallOptions,type InstallResult} from './installer.js';

const colors={accent:'#df7856',ink:'#f0f0e8',muted:'#9ca79e',green:'#a7c3a3'};
const phases=['Verify the reference library','Prepare documents and images','Install with recoverable backups','Check installed files'];

function Masthead(){return <Box flexDirection="column" marginBottom={1}><Text color={colors.accent} bold>{'  ╱╲   ╱  NOTORISM'}</Text><Text color={colors.ink}>{' ╱  ╲ ╱   Design starts with a decision.'}</Text><Box marginTop={1}><Text color={colors.muted}>110 styles   /   330 visual references   /   Artifact-first workflow</Text></Box></Box>}

export function InstallerApp({options,previewOnly=false,columns}:{options:InstallOptions;previewOnly?:boolean;columns?:number}){
  const {exit}=useApp();const {stdout}=useStdout();
  const width=Math.min(96,Math.max(40,columns??stdout.columns??80));
  const [screen,setScreen]=useState<'choose'|'review'|'install'|'done'|'error'>(previewOnly?'review':'choose');
  const [selected,setSelected]=useState<Agent[]>(options.agents);
  const [cursor,setCursor]=useState(0);
  const [progress,setProgress]=useState({step:'Ready',completed:0,total:4});
  const [result,setResult]=useState<InstallResult>();const [error,setError]=useState('');
  const targets=resolveTargets({...options,agents:selected.length?selected:['codex']});
  useInput((input,key)=>{
    if(key.escape||input==='q'){if(screen==='install')return;exit();return}
    if(previewOnly)return;
    if(screen==='choose'){
      if(key.upArrow||key.downArrow)setCursor(value=>1-value);
      if(input===' '){const agent:Agent=cursor===0?'codex':'claude';setSelected(value=>value.includes(agent)?value.filter(item=>item!==agent):[...value,agent])}
      if(key.return&&selected.length)setScreen('review');
    }else if(screen==='review'){
      if(key.return)setScreen('install');if(key.backspace)setScreen('choose');
    }else if((screen==='done'||screen==='error')&&key.return)exit();
  },{isActive:!previewOnly});
  useEffect(()=>{
    if(screen!=='install')return;
    let active=true;
    install({...options,agents:selected,onProgress:(step,completed,total)=>{if(active)setProgress({step,completed,total})}}).then(value=>{if(active){setResult(value);setScreen('done')}}).catch(reason=>{if(active){setError(reason.message);setScreen('error');process.exitCode=1}});
    return ()=>{active=false};
  },[screen]);
  const heading=screen==='choose'?'Choose your agents':screen==='review'?'Your design library':screen==='install'?'Preparing your workspace':screen==='done'?'Ready to design':'Installation needs attention';
  return <Box flexDirection="column" width={width} paddingX={1} paddingY={1}>
    <Masthead/>
    <Box borderStyle="single" borderColor={colors.muted} flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold color={colors.ink}>{heading}</Text>
      <Box marginTop={1} flexDirection="column">
        {screen==='choose'&&<><Text color={colors.muted}>Install the router where your agents discover skills.</Text>{(['codex','claude'] as Agent[]).map((agent,index)=><Box key={agent} marginTop={1}><Text color={cursor===index?colors.accent:colors.ink}>{cursor===index?'› ':'  '}{selected.includes(agent)?'[x]':'[ ]'} {agent==='codex'?'Codex':'Claude Code'}</Text><Text color={colors.muted}>  {agent==='codex'?'.codex/skills':'.claude/skills'}</Text></Box>)}<Box marginTop={2}><Text color={colors.muted}>↑ ↓ Move   Space Select   Enter Continue   Esc Exit</Text></Box></>}
{screen==='review'&&<><Text color={colors.accent}>LIBRARY</Text><Text wrap="wrap" color={colors.ink}>{targets.root}</Text><Box marginTop={1} flexDirection="column"><Text color={colors.accent}>AGENTS</Text>{targets.agents.map(target=><Text key={target.agent} wrap="wrap" color={colors.ink}>{target.directory}</Text>)}</Box><Box marginTop={1} flexDirection="column"><Text color={colors.muted}>110 style guides, three images per style, editable studies,</Text><Text color={colors.muted}>offline gallery, research notes, and artifact validation.</Text><Text color={colors.muted}>SessionStart loads core guidance and design contracts.</Text><Text color={colors.muted}>Changed files receive backups. Unrelated files stay in place.</Text></Box><Box marginTop={2}><Text color={colors.accent}>{previewOnly?'Installer preview / no changes made':'Enter Install   Backspace Choose agents   Esc Exit'}</Text></Box></>}
        {screen==='install'&&<><Text color={colors.accent}>{'━'.repeat(progress.completed*7)}<Text color={colors.muted}>{'─'.repeat((4-progress.completed)*7)}</Text></Text><Box flexDirection="column" marginTop={1}>{phases.map((phase,index)=><Text key={phase} color={index<progress.completed?colors.green:index===progress.completed?colors.accent:colors.muted}>{index<progress.completed?'✓ ':index===progress.completed?'› ':'  '}{phase}</Text>)}</Box><Box marginTop={1}><Text color={colors.muted}>{progress.step}</Text></Box></>}
{screen==='done'&&result&&<><Text color={colors.green}>✓  Library installed and verified</Text><Text wrap="wrap" color={colors.ink}>{result.root}</Text><Box marginTop={1} flexDirection="column"><Text color={colors.muted}>{result.changed} files written · {result.unchanged} already current</Text><Text color={colors.ink}>Invoke $notorism-design in your agent.</Text>{result.hookReviewRequired&&<Text color={colors.accent}>Codex: review and trust NotorismDesign in /hooks.</Text>}<Text color={colors.muted}>SessionStart is registered for the selected agents.</Text><Text color={colors.muted}>Open {result.root}/index.html to explore references.</Text>{result.backup&&<Text color={colors.muted}>Recover changed files from {result.backup}</Text>}</Box><Box marginTop={2}><Text color={colors.accent}>Enter Close</Text></Box></>}
        {screen==='error'&&<><Text color={colors.accent} wrap="wrap">{error}</Text><Box marginTop={1}><Text color={colors.muted}>Enter Close</Text></Box></>}
      </Box>
    </Box>
    <Box marginTop={1}><Text color={colors.muted}>NOTORISMDESIGN  1.0.0                         Local. Inspectable. Yours.</Text></Box>
  </Box>;
}
