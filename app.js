const API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const SEASON_START = "20261020"; // 2026–27 regular season opening date
const TEAM_NAMES = {
 ATL:"Atlanta Hawks",BOS:"Boston Celtics",BKN:"Brooklyn Nets",CHA:"Charlotte Hornets",CHI:"Chicago Bulls",CLE:"Cleveland Cavaliers",DAL:"Dallas Mavericks",DEN:"Denver Nuggets",DET:"Detroit Pistons",GSW:"Golden State Warriors",HOU:"Houston Rockets",IND:"Indiana Pacers",LAC:"LA Clippers",LAL:"Los Angeles Lakers",MEM:"Memphis Grizzlies",MIA:"Miami Heat",MIL:"Milwaukee Bucks",MIN:"Minnesota Timberwolves",NOP:"New Orleans Pelicans",NYK:"New York Knicks",OKC:"Oklahoma City Thunder",ORL:"Orlando Magic",PHI:"Philadelphia 76ers",PHX:"Phoenix Suns",POR:"Portland Trail Blazers",SAC:"Sacramento Kings",SAS:"San Antonio Spurs",TOR:"Toronto Raptors",UTA:"Utah Jazz",WAS:"Washington Wizards"
};
const $ = s => document.querySelector(s);
const storageKey = "courtside-tracker-v1";
let saved = loadSaved(), allGames = [], filter = "all", selectedTeam = "all", dateOffset = 0, selectedGame = null;
function loadSaved(){try{return JSON.parse(localStorage.getItem(storageKey))||{games:{}}}catch{return {games:{}}}}
function persist(){localStorage.setItem(storageKey,JSON.stringify(saved));renderStats()}
function normalizeTeamAbbr(abbr){
 // ESPN sometimes identifies the New York Knicks as "NY" instead of "NYK".
 // Use one canonical key so the team appears consistently in every stats view.
 return abbr === "NY" ? "NYK" : abbr;
}
function teamAbbr(c){return normalizeTeamAbbr(c?.team?.abbreviation || c?.abbreviation || "TBD")}
function teamName(c){const abbr=teamAbbr(c);return TEAM_NAMES[abbr] || c?.team?.displayName || c?.displayName || abbr}
function scoreOf(c){return c?.score ?? ""}
function normalizeEvent(e){
 const comp=e.competitions?.[0]||{}, competitors=comp.competitors||[];
 const home=competitors.find(x=>x.homeAway==="home")||competitors[0]||{}, away=competitors.find(x=>x.homeAway==="away")||competitors[1]||{};
 const status=e.status?.type||{};
 return {id:e.id,date:e.date,shortDate:new Date(e.date).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}),home:{abbr:teamAbbr(home),name:teamName(home),score:scoreOf(home),winner:!!home.winner},away:{abbr:teamAbbr(away),name:teamName(away),score:scoreOf(away),winner:!!away.winner},status:status.name||"STATUS_SCHEDULED",statusText:status.shortDetail||status.description||"Scheduled",completed:!!status.completed,live:status.state==="in",venue:comp.venue?.fullName||"",time:new Date(e.date).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}),dateKey:(e.date||"").slice(0,10),season:e.season?.year};
}
function getRecord(id){return saved.games[id]||{watched:false,homeMvp:"",awayMvp:"",note:""}}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function setStatus(msg,error=false){$("#status").textContent=msg;$("#status").classList.toggle("error",error)}
function dateKey(d){return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`}
function dateRange(){
 const now=new Date(); const start=new Date(2026,9,20); // October 20, 2026
 const from=new Date(start); from.setDate(from.getDate()+dateOffset*7);
 const to=new Date(from); to.setDate(to.getDate()+6);
 // Do not request dates before opening night; fetch the current window as one week.
 return {from:dateKey(from),to:dateKey(to),label:`${from.toLocaleDateString(undefined,{month:"short",day:"numeric"})} – ${to.toLocaleDateString(undefined,{month:"short",day:"numeric"})}`};
}
async function fetchWeek(){
 const {from,to,label}=dateRange();setStatus(`Loading games · ${label}…`);
 try{
  const dates=[];let d=new Date(`${from.slice(0,4)}-${from.slice(4,6)}-${from.slice(6,8)}T12:00:00`),end=new Date(`${to.slice(0,4)}-${to.slice(4,6)}-${to.slice(6,8)}T12:00:00`);
  while(d<=end){dates.push(dateKey(d));d.setDate(d.getDate()+1)}
  const responses=await Promise.all(dates.map(async date=>{const r=await fetch(`${API}/scoreboard?dates=${date}&limit=100`);if(!r.ok)throw new Error(`NBA feed returned ${r.status}`);return r.json()}));
  const events=responses.flatMap(j=>j.events||[]).map(normalizeEvent);
  allGames=events.filter(g=>g.dateKey.replaceAll("-","")>=SEASON_START).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(!allGames.length){setStatus("No games returned for this date range. Try refreshing or loading another week.");}
  else setStatus(`${allGames.length} games · ${label} · Updated ${new Date().toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}`);
  renderGames();
 }catch(err){
  console.error(err);setStatus("Couldn't load the live schedule. Check your connection, then refresh. Personal tracking is still saved.",true);
  renderGames();
 }
}
function gameCard(g){
 const rec=getRecord(g.id), state=g.live?"LIVE":g.completed?"FINAL":g.statusText.toUpperCase();
 const homeScore=g.home.score===""?"—":g.home.score,awayScore=g.away.score===""?"—":g.away.score;
 return `<article class="game-card" data-game="${g.id}" tabindex="0" role="button" aria-label="Open ${escapeHtml(g.away.name)} at ${escapeHtml(g.home.name)}">
 <div class="game-top"><span>${escapeHtml(g.shortDate)} · ${escapeHtml(g.time)}</span><span class="state ${g.completed?"final":""}">${escapeHtml(state)}</span></div>
 <div class="matchup">
  <div class="team"><div class="abbr">${escapeHtml(g.away.abbr)}</div><div class="name">${escapeHtml(g.away.name)}</div></div>
  <div class="score">${escapeHtml(awayScore)} <span class="dash">–</span> ${escapeHtml(homeScore)}</div>
  <div class="team"><div class="abbr">${escapeHtml(g.home.abbr)}</div><div class="name">${escapeHtml(g.home.name)}</div></div>
 </div>
 <div class="game-bottom"><span>${g.completed?"Final score":g.live?"In progress":escapeHtml(g.venue||"Scheduled")}</span><span class="${rec.watched?"watched-tag":""}">${rec.watched?"✓ WATCHED":"VIEW GAME →"}</span></div>
 </article>`;
}
function renderGames(){
 const teamOptions=Object.entries(TEAM_NAMES).sort((a,b)=>a[1].localeCompare(b[1])).map(([abbr,name])=>`<option value="${abbr}" ${selectedTeam===abbr?"selected":""}>${name}</option>`).join("");
 $("#team-filter").innerHTML=`<option value="all">All 30 teams</option>${teamOptions}`;
 let games=allGames.filter(g=>selectedTeam==="all"||g.home.abbr===selectedTeam||g.away.abbr===selectedTeam);
 games=games.filter(g=>filter==="all"||(filter==="watched"&&getRecord(g.id).watched)||(filter==="final"&&g.completed)||(filter==="upcoming"&&!g.completed&&!g.live));
 const grouped={};games.forEach(g=>(grouped[g.dateKey]??=[]).push(g));
 let html="";
 Object.entries(grouped).forEach(([day,gs])=>{const date=new Date(`${day}T12:00:00`).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});html+=`<div class="day-heading">${escapeHtml(date)}</div>${gs.map(gameCard).join("")}`});
 $("#games-list").innerHTML=html||`<div class="empty-state">${allGames.length?"No games match these filters.":"No schedule available for this week yet."}</div>`;
 $("#load-more").classList.toggle("hidden",false);
}
async function loadGameDetails(g){
 selectedGame=g;const dialog=$("#game-dialog"),rec=getRecord(g.id);
 $("#dialog-date").textContent=`${g.shortDate} · ${g.time}`;
 $("#dialog-title").textContent=`${g.away.abbr} at ${g.home.abbr}`;
 $("#dialog-score").textContent=`${g.away.score||"—"}  –  ${g.home.score||"—"}`;
 $("#dialog-content").innerHTML=`<p class="notice">Loading box score…</p>`;
 dialog.showModal();
 let box=null;
 try{const r=await fetch(`${API}/summary?event=${encodeURIComponent(g.id)}`);if(r.ok)box=await r.json()}catch(e){console.warn("Box score unavailable",e)}
 const players=extractPlayers(box);
 const teamData=extractBoxTeams(box,g);
 $("#dialog-content").innerHTML=`
  ${teamData}
  <label class="watch-row"><input id="watched-check" type="checkbox" ${rec.watched?"checked":""}> <span><strong>I've watched this game</strong><br><span class="notice">Only watched games count toward your stats and MVP rankings.</span></span></label>
  <div class="pick-section"><label for="home-mvp">Most impressive ${escapeHtml(g.home.name)} player</label><select id="home-mvp"><option value="">Choose a player…</option>${players[g.home.abbr]?.map(p=>`<option value="${escapeHtml(p.name)}" ${rec.homeMvp===p.name?"selected":""}>${escapeHtml(p.name)}${p.stats?` · ${escapeHtml(p.stats)}`:""}</option>`).join("")||""}</select></div>
  <div class="pick-section"><label for="away-mvp">Most impressive ${escapeHtml(g.away.name)} player</label><select id="away-mvp"><option value="">Choose a player…</option>${players[g.away.abbr]?.map(p=>`<option value="${escapeHtml(p.name)}" ${rec.awayMvp===p.name?"selected":""}>${escapeHtml(p.name)}${p.stats?` · ${escapeHtml(p.stats)}`:""}</option>`).join("")||""}</select></div>
  ${(!players[g.home.abbr]?.length&&!players[g.away.abbr]?.length)?`<p class="notice">Player list isn't available from the data feed. You can still mark the game watched; try opening it again after the box score is published.</p>`:""}
  <div class="pick-section"><label for="game-note">Personal note (optional)</label><textarea id="game-note" rows="2" placeholder="What stood out?">${escapeHtml(rec.note||"")}</textarea></div>
  <button id="save-game" class="save-button">Save my game</button>
  <p class="notice">MVP picks are optional, but are only counted once this game is marked watched.</p>`;
 $("#save-game").addEventListener("click",saveGame);
}
function extractPlayers(data){
 const out={};const teams=data?.boxscore?.players||[];
 teams.forEach(team=>{
  const abbr=normalizeTeamAbbr(team.team?.abbreviation || "");const names=team.statistics?.[0]?.athletes||[];
  out[abbr]=names.map(a=>{const s=a.stats||[];const labels=team.statistics?.[0]?.labels||[];const get=(key)=>{const i=labels.indexOf(key);return i>=0?s[i]:""};return {name:a.athlete?.displayName||a.athlete?.shortName||a.displayName||"",stats:[get("PTS")&&`${get("PTS")} PTS`,get("REB")&&`${get("REB")} REB`,get("AST")&&`${get("AST")} AST`].filter(Boolean).join(" · ")}}).filter(p=>p.name);
 });
 return out;
}
function extractBoxTeams(data,g){
 const groups=data?.boxscore?.players||[];
 if(!groups.length)return `<p class="notice">Full player box score isn't available yet, or the feed did not return player data.</p>`;
 return groups.map(team=>{
  const stat=team.statistics?.[0]||{},labels=stat.labels||[],athletes=stat.athletes||[];
  const colIndex=["MIN","PTS","REB","AST","STL","BLK","TO","FG","3PT","FT"].map(x=>labels.indexOf(x));
  const available=colIndex.map((v,i)=>v>=0?["MIN","PTS","REB","AST","STL","BLK","TO","FG","3PT","FT"][i]:null).filter(Boolean);
  return `<div class="boxscore-heading"><h3>${escapeHtml(team.team?.displayName||team.team?.abbreviation||"Team")}</h3></div><div class="table-wrap"><table><thead><tr><th>Player</th>${available.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${athletes.map(a=>`<tr><td>${escapeHtml(a.athlete?.shortName||a.athlete?.displayName||"Player")}</td>${available.map(x=>{const i=labels.indexOf(x);return `<td>${escapeHtml(a.stats?.[i]??"—")}</td>`}).join("")}</tr>`).join("")}</tbody></table></div>`;
 }).join("");
}
function saveGame(){
 if(!selectedGame)return;const id=selectedGame.id,watched=$("#watched-check").checked,homeMvp=$("#home-mvp").value,awayMvp=$("#away-mvp").value,note=$("#game-note").value.trim();
 saved.games[id]={watched,homeMvp:watched?homeMvp:"",awayMvp:watched?awayMvp:"",note};
 persist();$("#game-dialog").close();renderGames();
}
function watchedGames(){return Object.entries(saved.games).filter(([id,r])=>r.watched)}
function renderStats(){
 const watched=watchedGames();$("#watched-count").textContent=watched.length;
 const teamCounts={};const mvpCounts={};let voteCount=0;const pickRows=[];
 watched.forEach(([id,r])=>{
  const g=allGames.find(x=>x.id===id);
  if(g){teamCounts[g.home.abbr]=(teamCounts[g.home.abbr]||0)+1;teamCounts[g.away.abbr]=(teamCounts[g.away.abbr]||0)+1}
  [[r.homeMvp,g?.home?.name,g?.home?.abbr],[r.awayMvp,g?.away?.name,g?.away?.abbr]].forEach(([player,team,abbr])=>{if(player){voteCount++;mvpCounts[player]=(mvpCounts[player]||0)+1;pickRows.push({player,team:team||abbr||"Team",date:g?.shortDate||"Saved game",id})}});
 });
 $("#teams-count").textContent=Object.keys(teamCounts).length;$("#votes-count").textContent=voteCount;
 const teamSorted=Object.entries(teamCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 $("#team-leaderboard").innerHTML=teamSorted.length?teamSorted.slice(0,10).map(([abbr,count],i)=>`<div class="leader-row"><div class="rank">${String(i+1).padStart(2,"0")}</div><div><div class="leader-name">${escapeHtml(TEAM_NAMES[abbr]||abbr)}</div><div class="bar-track"><div class="bar-fill" style="width:${count/Math.max(...teamSorted.map(x=>x[1]))*100}%"></div></div></div><div class="leader-value">${count} ${count===1?"game":"games"}</div></div>`).join(""):`<div class="empty">No watched games yet.</div>`;
 $("#team-breakdown").innerHTML=teamSorted.length?Object.entries(TEAM_NAMES).sort((a,b)=>(teamCounts[b[0]]||0)-(teamCounts[a[0]]||0)||a[1].localeCompare(b[1])).filter(([a])=>teamCounts[a]).map(([a,n])=>`<div class="team-stat"><strong>${escapeHtml(a)} · ${teamCounts[a]||0}</strong><span>${escapeHtml(n)}</span></div>`).join(""):`<div class="empty">Your team totals will appear here.</div>`;
 const mvps=Object.entries(mvpCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 $("#mvp-leaderboard").innerHTML=mvps.length?mvps.map(([name,count],i)=>`<div class="leader-row"><div class="rank">${String(i+1).padStart(2,"0")}</div><div><div class="leader-name">${escapeHtml(name)}</div><div class="leader-meta">Your personal MVP pick</div><div class="bar-track"><div class="bar-fill" style="width:${count/Math.max(...mvps.map(x=>x[1]))*100}%"></div></div></div><div class="leader-value">${count} ${count===1?"pick":"picks"}</div></div>`).join(""):`<div class="empty">Choose a player MVP for each team in a watched game.</div>`;
 $("#recent-picks").innerHTML=pickRows.length?pickRows.slice(-8).reverse().map(p=>`<div class="leader-row"><div class="rank">★</div><div><div class="leader-name">${escapeHtml(p.player)}</div><div class="leader-meta">${escapeHtml(p.team)} · ${escapeHtml(p.date)}</div></div><div class="leader-value">MVP</div></div>`).join(""):`<div class="empty">Your saved picks will appear here.</div>`;
}
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===btn));document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===`${btn.dataset.tab}-view`));if(btn.dataset.tab!=="games")renderStats()}));
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{filter=btn.dataset.filter;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===btn));renderGames()}));
$("#team-filter").addEventListener("change",e=>{selectedTeam=e.target.value;renderGames()});
$("#refresh-btn").addEventListener("click",fetchWeek);
$("#load-more").addEventListener("click",()=>{dateOffset++;fetchWeek()});
$("#close-dialog").addEventListener("click",()=>$("#game-dialog").close());
$("#games-list").addEventListener("click",e=>{const card=e.target.closest("[data-game]");if(card){const game=allGames.find(g=>g.id===card.dataset.game);if(game)loadGameDetails(game)}});
$("#games-list").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-game]")){e.preventDefault();e.target.click()}});
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(console.warn);
fetchWeek();renderStats();