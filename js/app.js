'use strict';

const CONFIG = Object.assign({
  APP_NAME: 'KleverDi Student Portfolio',
  TEACHER_PASSWORD: 'admin2026',
  STORAGE_KEY: 'kleverdi_student_portfolio_v3',
  SESSION_KEY: 'kleverdi_student_portfolio_session_v3',
  COLLECTOR_URL: '',
  AUTO_COLLECT_ON_SAVE: false
}, window.PORTFOLIO_CONFIG || {});

const app = document.getElementById('app');
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const uid = () => 'id_' + Math.random().toString(36).slice(2,10) + '_' + Date.now().toString(36);
const today = () => new Date().toISOString().slice(0,10);
const esc = (v='') => String(v ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[s]));
const nl = (v='') => esc(v).replace(/\n/g,'<br>');
const slug = (v='') => String(v).trim().toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,80) || uid();

const NAV = [
  ['dashboard','🏠','Главная'],['profile','👤','Профиль'],['goals','🎯','Цели'],['skills','🌱','Личные качества'],
  ['works','📚','Учебные работы'],['projects','🚀','Проекты и инициативы'],['interests','✨','Интересы'],['diary','🧠','Дневник'],
  ['team','🤝','Командная работа'],['kleverdi','🍀','КлеверДи'],['certs','🏆','Достижения'],['review','✅','Самооценка'],['preview','📄','Превью']
];
const BOTTOM = ['dashboard','projects','skills','kleverdi','preview'];
const SKILLS = ['Ответственность','Самостоятельность','Коммуникация','Работа в команде','Организованность','Тайм-менеджмент','Публичные выступления','Поиск информации','Критическое мышление','Креативность','Лидерство','Цифровая грамотность','Иностранный язык','Учебная дисциплина'];

const Toast = { show(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(this.t); this.t=setTimeout(()=>el.classList.remove('show'),2200); } };

const Store = {
  load(){
    try{
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){ console.warn(e); }
    const db = seedDB();
    this.save(db);
    return db;
  },
  save(db){ localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(db)); },
  students(){ return this.load().students || []; },
  getStudent(id){ return this.students().find(s => s.id === id); },
  findOrCreate(fullName, group){
    const db = this.load();
    const key = slug(fullName + '-' + group);
    let s = db.students.find(x => x.loginKey === key);
    if(!s){ s = createStudent(fullName, group); s.loginKey = key; db.students.push(s); this.save(db); }
    return s;
  },
  updateStudent(id, fn, options={}){
    const db = this.load();
    const s = db.students.find(x => x.id === id);
    if(!s) return null;
    fn(s);
    s.updatedAt = new Date().toISOString();
    this.save(db);
    if(options.collect || CONFIG.AUTO_COLLECT_ON_SAVE) Collector.queue(s, options.collect ? 'manual' : 'autosave');
    return s;
  },
  deleteStudent(id){ const db=this.load(); db.students=(db.students||[]).filter(s=>s.id!==id); this.save(db); },
  replaceStudent(student){
    const db=this.load(); const i=(db.students||[]).findIndex(s=>s.id===student.id);
    student.updatedAt = new Date().toISOString();
    if(i>=0) db.students[i]=student; else db.students.push(student);
    this.save(db);
  },
  setConfigPatch(patch){ const db=this.load(); db.config = Object.assign({}, db.config || {}, patch); this.save(db); },
  getConfig(){ return this.load().config || {}; },
  reset(){ localStorage.removeItem(CONFIG.STORAGE_KEY); localStorage.removeItem(CONFIG.SESSION_KEY); this.save(seedDB()); }
};

const Session = {
  get(){ try{return JSON.parse(localStorage.getItem(CONFIG.SESSION_KEY)||'null')}catch{return null} },
  set(x){ localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(x)); },
  clear(){ localStorage.removeItem(CONFIG.SESSION_KEY); }
};

function createStudent(fullName='Новый студент', group=''){
  return {
    id:uid(), loginKey:slug(fullName+'-'+group), fullName:fullName.trim(), group:group.trim(), course:'1 курс', speciality:'', photo:'', phone:'', email:'',
    direction:'', about:'', whyIT:'', goalYear:'',
    goals:{sem1:'',sem2:'',project:'',improve:'',result:''},
    skills:SKILLS.map(name=>({id:uid(), name, start:1, current:1, improve:''})),
    works:[], projects:[], interests:[], diary:[], teamwork:[], certs:[],
    kleverdi:{about:'',tasks:'',tools:'',interesting:'',difficult:'',ideaTitle:'',ideaProblem:'',ideaSolution:''},
    self:{regular:1, computer:1, newSkill:1, portfolio:1, team:1, help:1, errors:1, result:1, confidence:1, proud:'', improve:'', next:''},
    teacher:{strengths:'',recommendations:'',level:'Начальный',comment:''},
    collect:{lastSubmittedAt:'',lastStatus:'not_submitted'},
    createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()
  };
}
function seedDB(){
  const demo=createStudent('Демо Студент','1 курс');
  demo.speciality=''; demo.phone='+996 ___ __ __ __'; demo.email='student@example.com';
  demo.direction='Спорт, творчество, общественная деятельность';
  demo.about='Я студент 1 курса. Хочу развиваться, пробовать новое, участвовать в проектах и собирать свои достижения в одном месте.';
  demo.whyIT='Я выбрал это направление, потому что хочу получить хорошее образование, развить свои способности и определиться с будущей профессией.';
  demo.goalYear='Стать самостоятельнее, улучшить учебные результаты и принять участие хотя бы в одном проекте или мероприятии.';
  demo.goals={sem1:'Адаптироваться к учёбе и выработать хороший режим.',sem2:'Улучшить результаты и активнее участвовать в жизни колледжа.',project:'Принять участие в полезном учебном или общественном проекте.',improve:'Ответственность, коммуникацию и самоорганизацию.',result:'Портфолио с учебными работами, достижениями и личным прогрессом.'};
  demo.skills.forEach((x,i)=>{x.start=1; x.current=i<7?3:2;});
  demo.works.push({id:uid(),title:'Моя лучшая учебная работа',subject:'Учебная дисциплина',date:today(),description:'Работа, которой я доволен.',result:'Научился лучше планировать и оформлять результат.',proof:''});
  demo.projects.push({id:uid(),title:'Участие в студенческом мероприятии',type:'Общественная активность',date:today(),tech:'',goal:'Попробовать себя в новой роли',description:'Помогал команде с подготовкой мероприятия.',error:'Сначала было трудно распределить задачи.',lesson:'Научился взаимодействовать с командой.',link:''});
  demo.interests.push({id:uid(),name:'Спорт',type:'Увлечение',description:'Помогает развивать дисциплину и командный дух.'});
  demo.diary.push({id:uid(),date:today(),title:'Первая неделя',learned:'Познакомился с учебным процессом и поставил цели.',hard:'Нужно привыкнуть к новому расписанию.',next:'Хочу лучше организовать своё время.'});
  demo.kleverdi={about:'КлеверДи — место для развития студентов, практики и новых возможностей.',tasks:'Участие в занятиях, мероприятиях и полезных инициативах.',tools:'',interesting:'Интересно получать новый опыт и знакомиться с разными направлениями.',difficult:'Пока сложно определить, что мне подходит больше всего.',ideaTitle:'Идея для студенческой жизни',ideaProblem:'Студентам не всегда хватает информации о возможностях и мероприятиях.',ideaSolution:'Сделать единое пространство, где публикуются активности, конкурсы, проекты и достижения студентов.'};
  return {version:3, config:{collectorUrl:CONFIG.COLLECTOR_URL || '', autoCollect:CONFIG.AUTO_COLLECT_ON_SAVE}, students:[demo]};
}

function getPath(obj,path){return path.split('.').reduce((o,k)=>o?.[k],obj)}
function setPath(obj,path,value){const p=path.split('.'); let o=obj; while(p.length>1){const k=p.shift(); if(typeof o[k] !== 'object' || !o[k]) o[k]={}; o=o[k];} o[p[0]]=value;}
function initials(name=''){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'ST'}
function completion(s){
  const checks=[!!s.fullName,!!s.group,!!s.about,!!s.whyIT,!!s.goalYear,!!s.goals.sem1,!!s.goals.sem2,s.skills.some(x=>+x.current>=3),s.works.length>=3,s.projects.length>=1,s.interests.length>=1,s.diary.length>=2,s.teamwork.length>=1,!!s.kleverdi.about,s.certs.length>=1,!!s.self.proud];
  return Math.round(checks.filter(Boolean).length/checks.length*100);
}
function badges(s){
  const arr=[];
  if(s.about) arr.push(['Портфолио начато','good']);
  if(s.works.length>=3) arr.push(['Учебный прогресс','good']);
  if(s.projects.length) arr.push(['Активный студент','']);
  if(s.teamwork.length) arr.push(['Командный игрок','']);
  if(s.certs.length) arr.push(['Есть достижение','warn']);
  if(completion(s)>=75) arr.push(['Портфолио заполнено','warn']);
  return arr.length?arr:[['Пока нет бейджей','gray']];
}

function collectorUrl(){ return (Store.getConfig().collectorUrl || CONFIG.COLLECTOR_URL || '').trim(); }
function collectPayload(s, reason='manual'){
  return {
    app:'KleverDi Student Portfolio', reason, submittedAt:new Date().toISOString(), progress:completion(s),
    id:s.id, fullName:s.fullName, group:s.group, course:s.course, speciality:s.speciality, phone:s.phone, email:s.email,
    direction:s.direction, about:s.about, goalYear:s.goalYear,
    counts:{works:s.works.length,projects:s.projects.length,interests:s.interests.length,diary:s.diary.length,teamwork:s.teamwork.length,certs:s.certs.length},
    portfolio:s
  };
}
const Collector = {
  timer:null,
  queue(s, reason){ clearTimeout(this.timer); this.timer=setTimeout(()=>this.submit(s, reason, false), 900); },
  async submit(s, reason='manual', show=true){
    const url=collectorUrl();
    Store.updateStudent(s.id, x=>{x.collect.lastSubmittedAt=new Date().toISOString(); x.collect.lastStatus=url?'sending':'local_only';}, {collect:false});
    if(!url){ if(show) Toast.show('Отправка пока не настроена. Обратитесь к преподавателю.'); return {ok:false, localOnly:true}; }
    try{
      await fetch(url, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(collectPayload(s, reason))});
      Store.updateStudent(s.id, x=>{x.collect.lastSubmittedAt=new Date().toISOString(); x.collect.lastStatus='sent';}, {collect:false});
      if(show) Toast.show('Готово! Портфолио успешно отправлено преподавателю.');
      return {ok:true};
    }catch(e){
      console.warn(e);
      Store.updateStudent(s.id, x=>{x.collect.lastStatus='error';}, {collect:false});
      if(show) Toast.show('Не удалось отправить. Проверьте интернет и попробуйте ещё раз.');
      return {ok:false,error:e};
    }
  }
};

function render(){
  Store.load();
  const session=Session.get();
  if(!session) return renderLogin();
  if(session.role==='teacher') return renderTeacher(session.page || 'teacher-dashboard');
  return renderStudent(session.studentId, session.page || 'dashboard');
}

function renderLogin(){
  app.innerHTML=`
  <main class="login-page">
    <section class="login-wrap">
      <div class="hero glass">
        <div class="brand"><div class="logo">K</div><span>KleverDi Student Portfolio</span></div>
        <div class="kicker">✨ Электронное портфолио 1 курса</div>
        <h1>Создай своё уникальное портфолио</h1>
        <p class="lead">Собери в одном месте свои достижения, проекты, цели, интересы и самые важные моменты студенческой жизни. Покажи свой рост и создай портфолио, которым можно гордиться.</p>
        <div class="hero-grid">
          <div class="hero-mini"><b>Расскажи о себе</b><span>Добавь информацию о себе, своих интересах и целях.</span></div>
          <div class="hero-mini"><b>Покажи достижения</b><span>Собирай лучшие работы, проекты, сертификаты и мероприятия.</span></div>
          <div class="hero-mini"><b>Следи за своим ростом</b><span>Отмечай новые навыки, успехи и важные шаги в течение года.</span></div>
          <div class="hero-mini"><b>Создай своё будущее</b><span>Портфолио пригодится в учёбе, практике и дальнейших возможностях.</span></div>
        </div>
      </div>
      <div class="auth-card">
        <div class="tabs"><button class="active" id="studentTab">Студент</button><button id="teacherTab">Преподаватель</button></div>
        <form class="form" id="studentForm">
          <div class="field"><label>Ф.И.О.</label><input class="input" name="fullName" required placeholder="Например: Асанов Бектур" autocomplete="name"></div>
          <div class="field"><label>Группа</label><input class="input" name="group" required placeholder="Например: АСУ-1-26"></div>
          <button class="btn primary">Создать моё портфолио</button>
          <p class="help">Начни сейчас — первые разделы можно заполнить всего за несколько минут.</p>
        </form>
        <form class="form hidden" id="teacherForm">
          <div class="field"><label>Пароль преподавателя</label><input class="input" name="password" type="password" required></div>
          <button class="btn primary">Открыть админ-панель</button>
        </form>
      </div>
    </section>
  </main>`;
  $('#studentTab').onclick=()=>{ $('#studentTab').classList.add('active'); $('#teacherTab').classList.remove('active'); $('#studentForm').classList.remove('hidden'); $('#teacherForm').classList.add('hidden'); };
  $('#teacherTab').onclick=()=>{ $('#teacherTab').classList.add('active'); $('#studentTab').classList.remove('active'); $('#teacherForm').classList.remove('hidden'); $('#studentForm').classList.add('hidden'); };
  $('#studentForm').onsubmit=e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); const s=Store.findOrCreate(fd.get('fullName'), fd.get('group')); Session.set({role:'student',studentId:s.id,page:'dashboard'}); render(); };
  $('#teacherForm').onsubmit=e=>{ e.preventDefault(); const pass=new FormData(e.currentTarget).get('password'); if(pass!==CONFIG.TEACHER_PASSWORD) return Toast.show('Неверный пароль'); Session.set({role:'teacher',page:'teacher-dashboard'}); render(); };
}

function renderStudent(id,page){
  const s=Store.getStudent(id); if(!s){Session.clear(); return renderLogin();}
  const nav= NAV.map(([p,ic,lab])=>`<button class="${page===p?'active':''}" data-page="${p}"><span>${ic}</span>${lab}</button>`).join('');
  const bottom=BOTTOM.map(p=>{const n=NAV.find(x=>x[0]===p); return `<button class="${page===p?'active':''}" data-page="${p}"><span>${n[1]}</span><span>${n[2]}</span></button>`}).join('');
  app.innerHTML=`
  <div class="app-shell">
    <aside class="sidebar"><div class="side-card">
      <div class="brand"><div class="logo">K</div><span>KleverDi</span></div>
      <div class="user-mini"><div class="avatar">${s.photo?`<img src="${s.photo}" alt="">`:esc(initials(s.fullName))}</div><div><b>${esc(s.fullName)}</b><span>${esc(s.group)} · ${esc(s.course)}</span></div></div>
      <nav class="nav">${nav}</nav>
      <div class="side-actions"><button class="btn primary" id="submitPortfolio">Сдать портфолио</button><button class="btn light" id="logoutBtn">Выйти</button></div>
    </div></aside>
    <main class="main">
      <div class="topbar">
        <div><h2>${sectionTitle(page)}</h2><p>${sectionHelp(page)}</p></div>
        <div class="top-actions no-print"><button class="btn good" id="saveNow">Сохранить</button><button class="btn light" id="exportStudent">JSON</button><button class="btn light" id="printBtn">PDF/Печать</button></div>
      </div>
      <div id="content">${renderSection(s,page)}</div>
    </main>
    <nav class="bottom-nav no-print">${bottom}</nav>
  </div>`;
  $$('[data-page]').forEach(btn=>btn.onclick=()=>{Session.set({role:'student',studentId:id,page:btn.dataset.page}); render();});
  $('#logoutBtn')?.addEventListener('click',()=>{Session.clear();render();});
  $('#saveNow')?.addEventListener('click',()=>{Toast.show('Сохранено');});
  $('#printBtn')?.addEventListener('click',()=>window.print());
  $('#exportStudent')?.addEventListener('click',()=>downloadJSON(`portfolio-${slug(s.fullName)}.json`, collectPayload(s,'export')));
  $('#submitPortfolio')?.addEventListener('click',()=>Collector.submit(Store.getStudent(id),'manual',true));
  bindStudentEvents(id,page);
}
function sectionTitle(p){ return (NAV.find(x=>x[0]===p)||[])[2] || 'Портфолио'; }
function sectionHelp(p){ return ({dashboard:'Общий прогресс и быстрые действия.',profile:'Основная информация о студенте.',goals:'Личные и учебные цели на семестр и год.',skills:'Самооценка личных и универсальных навыков от 1 до 5.',works:'Лучшие учебные задания и результаты.',projects:'Проекты, мероприятия, инициативы и личный вклад.',interests:'Интересы, увлечения и направления развития.',diary:'Еженедельный или ежемесячный дневник роста.',team:'Опыт командной работы.',kleverdi:'Опыт, активности и впечатления в КлеверДи.',certs:'Сертификаты, грамоты, мероприятия и достижения.',review:'Самооценка студента и отзыв преподавателя.',preview:'Готовый вид портфолио для печати или PDF.'})[p] || ''; }

function renderSection(s,page){
  if(page==='dashboard') return renderDashboard(s);
  if(page==='profile') return renderProfile(s);
  if(page==='goals') return renderGoals(s);
  if(page==='skills') return renderSkills(s);
  if(page==='works') return renderWorks(s);
  if(page==='projects') return renderProjects(s);
  if(page==='interests') return renderInterests(s);
  if(page==='diary') return renderDiary(s);
  if(page==='team') return renderTeam(s);
  if(page==='kleverdi') return renderKleverdi(s);
  if(page==='certs') return renderCerts(s);
  if(page==='review') return renderReview(s);
  if(page==='preview') return renderPreviewPanel(s);
  return '';
}
function progressHTML(s){const p=completion(s);return `<div class="progress-label"><span>Заполнение портфолио</span><span>${p}%</span></div><div class="progress-bar"><i style="width:${p}%"></i></div>`}
function renderDashboard(s){
  const done=[['Профиль заполнен',!!s.about],['Есть цель на год',!!s.goalYear],['Есть 3 учебные работы',s.works.length>=3],['Есть проект или активность',s.projects.length>=1],['Добавлены интересы',s.interests.length>=1],['Заполнен раздел КлеверДи',!!s.kleverdi.about]];
  return `<section class="grid"><div><div class="panel"><div class="section-title"><div><h3>Прогресс студента</h3><p>Портфолио показывает учебный, личный и общественный рост.</p></div></div>${progressHTML(s)}<div class="stats"><div class="stat"><strong>${s.projects.length}</strong><span>активностей</span></div><div class="stat"><strong>${s.works.length}</strong><span>работ</span></div><div class="stat"><strong>${s.interests.length}</strong><span>интересов</span></div><div class="stat"><strong>${s.diary.length}</strong><span>записей</span></div></div><div class="badges">${badges(s).map(b=>`<span class="badge ${b[1]}">${b[0]}</span>`).join('')}</div></div><div class="panel"><div class="section-title"><div><h3>Что нужно доделать</h3><p>Основные пункты портфолио.</p></div></div><div class="checklist">${done.map(([t,ok])=>`<div class="check ${ok?'':'off'}"><i>${ok?'✓':'·'}</i><span>${t}</span></div>`).join('')}</div></div></div><div><div class="panel"><div class="section-title"><div><h3>Сдать портфолио</h3><p>Когда закончишь заполнение, отправь портфолио преподавателю.</p></div></div><div class="sync-box"><div class="sync-status"><b>Статус:</b> ${syncLabel(s)}</div><button class="btn primary" id="sendAgain">Отправить портфолио</button></div></div><div class="panel"><div class="section-title"><div><h3>Быстрое заполнение</h3><p>Начните с главного.</p></div></div><div class="list"><button class="btn light" data-page="profile">Заполнить профиль</button><button class="btn light" data-page="projects">Добавить активность</button><button class="btn light" data-page="certs">Добавить достижение</button></div></div></div></section>`;
}

function syncLabel(s){ const st=s.collect?.lastStatus; if(st==='sent') return 'отправлено'; if(st==='sending') return 'отправляется'; if(st==='error') return 'ошибка отправки'; if(st==='local_only') return 'сохранено локально'; return 'ещё не сдавалось'; }
function input(path,label,value='',placeholder='',type='text'){return `<div class="field"><label>${label}</label><input class="input" data-bind="${path}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"></div>`}
function textarea(path,label,value='',placeholder=''){return `<div class="field"><label>${label}</label><textarea class="textarea" data-bind="${path}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></div>`}
function renderProfile(s){return `<section class="panel"><div class="section-title"><div><h3>Основная информация</h3><p>Эти данные будут видны в готовом портфолио.</p></div></div><div class="grid-2">${input('fullName','Ф.И.О.',s.fullName)}${input('group','Группа',s.group)}${input('speciality','Специальность / направление',s.speciality,'Например: Экономика, Менеджмент, Педагогика...')}${input('course','Курс',s.course)}${input('phone','Телефон',s.phone,'+996 ...')}${input('email','Email',s.email,'student@email.com')}${input('direction','Мои интересы',s.direction,'Спорт, творчество, наука, волонтёрство...')}</div><div class="divider"></div><div class="grid-2">${textarea('about','Коротко о себе',s.about)}${textarea('whyIT','Почему я выбрал эту специальность / направление?',s.whyIT)}${textarea('goalYear','Моя цель на 1 курс',s.goalYear)}</div><div class="divider"></div><div class="field"><label>Фото студента</label><input class="input" id="photoInput" type="file" accept="image/*"><p class="help">Фото хранится в браузере как часть портфолио.</p></div></section>`}
function renderGoals(s){return `<section class="panel"><div class="grid-2">${textarea('goals.sem1','Цель на 1 семестр',s.goals.sem1)}${textarea('goals.sem2','Цель на 2 семестр',s.goals.sem2)}${textarea('goals.project','Какой проект хочу сделать?',s.goals.project)}${textarea('goals.improve','Какие навыки хочу улучшить?',s.goals.improve)}${textarea('goals.result','Какой результат хочу показать к концу года?',s.goals.result)}</div></section>`}
function renderSkills(s){return `<section class="panel"><div class="section-title"><div><h3>Навыки</h3><p>1 — не умею, 5 — могу объяснить другим.</p></div></div><div class="grid-2">${s.skills.map(sk=>`<div class="skill-card"><div class="skill-head"><b>${esc(sk.name)}</b><span class="badge">${sk.current}/5</span></div><label class="help">Уровень в начале</label><input class="range" data-skill="${sk.id}" data-field="start" type="range" min="1" max="5" value="${sk.start}"><label class="help">Текущий уровень</label><input class="range" data-skill="${sk.id}" data-field="current" type="range" min="1" max="5" value="${sk.current}"><input class="input" data-skill="${sk.id}" data-field="improve" value="${esc(sk.improve)}" placeholder="Что хочу улучшить"></div>`).join('')}</div></section>`}
function listItems(items, type){ if(!items.length) return `<div class="empty">Пока ничего не добавлено.</div>`; return `<div class="list">${items.map(it=>itemCard(it,type)).join('')}</div>`; }
function itemCard(it,type){
  const title=it.title||it.word||it.name||'Без названия';
  const sub=it.subject||it.type||it.translation||it.role||it.organization||it.date||'';
  const body=it.description||it.result||it.example||it.learned||it.tasks||it.idea||it.comment||'';
  return `<article class="item"><div class="item-head"><div><h4>${esc(title)}</h4><p>${esc(sub)}</p></div><button class="btn small danger" data-del="${type}" data-id="${it.id}">Удалить</button></div>${body?`<p>${nl(body)}</p>`:''}${it.link||it.proof?`<p><b>Доказательство:</b> ${esc(it.link||it.proof)}</p>`:''}</article>`;
}
function renderWorks(s){return `<section class="grid"><div class="panel"><div class="section-title"><div><h3>Добавить учебную работу</h3></div></div><form class="form" data-add="works">${input('','Название работы','','Например: Таблица в Excel')}${input('','Предмет','','Информационные технологии')}${input('','Дата',today(),'','date')}${textarea('','Описание задания','')}${textarea('','Чему научился / результат','')}${input('','Файл, ссылка или скриншот','','https://...')}<button class="btn primary">Добавить</button></form></div><div class="panel"><h3>Мои учебные работы</h3>${listItems(s.works,'works')}</div></section>`}
function renderProjects(s){return `<section class="grid"><div class="panel"><div class="section-title"><div><h3>Добавить проект или активность</h3><p>Это может быть учебный проект, мероприятие, конкурс, волонтёрство или личная инициатива.</p></div></div><form class="form" data-add="projects">${input('','Название','','Например: Дебаты, конкурс, волонтёрская акция')}${input('','Тип','','Учебный проект, мероприятие, спорт, творчество...')}${input('','Дата',today(),'','date')}${input('','Моя роль','','Участник, организатор, капитан, автор...')}${textarea('','Цель / зачем участвовал','')}${textarea('','Что я сделал','')}${textarea('','Что было сложно','')}${textarea('','Чему научился','')}${input('','Ссылка / файл / фото','','https://...')}<button class="btn primary">Добавить</button></form></div><div class="panel"><h3>Мои проекты и активности</h3>${listItems(s.projects,'projects')}</div></section>`}
function renderInterests(s){return `<section class="grid"><div class="panel"><h3>Добавить интерес или увлечение</h3><form class="form" data-add="interests">${input('','Интерес / увлечение','','Спорт, музыка, чтение, языки...')}${input('','Категория','','Творчество, спорт, наука...')}${textarea('','Почему мне это интересно / что это мне даёт','')}<button class="btn primary">Добавить</button></form></div><div class="panel"><h3>Мои интересы</h3>${listItems(s.interests,'interests')}</div></section>`}
function renderDiary(s){return `<section class="grid"><div class="panel"><h3>Добавить запись</h3><form class="form" data-add="diary">${input('','Дата',today(),'','date')}${input('','Заголовок','','Неделя №1')}${textarea('','Что я изучил?','')}${textarea('','Что было трудно?','')}${textarea('','Что сделаю дальше?','')}<button class="btn primary">Добавить запись</button></form></div><div class="panel"><h3>Дневник роста</h3>${listItems(s.diary,'diary')}</div></section>`}
function renderTeam(s){return `<section class="grid"><div class="panel"><h3>Добавить командную работу</h3><form class="form" data-add="teamwork">${input('','Название команды / активности','','Команда №1')}${input('','Моя роль','','Лидер, участник, организатор, докладчик...')}${textarea('','Общая задача','')}${textarea('','Что сделал я','')}${textarea('','Чему научился','')}<button class="btn primary">Добавить</button></form></div><div class="panel"><h3>Командная работа</h3>${listItems(s.teamwork,'teamwork')}</div></section>`}
function renderKleverdi(s){return `<section class="panel"><div class="section-title"><div><h3>Мой опыт в КлеверДи</h3><p>Здесь студент фиксирует участие, впечатления и личный рост.</p></div></div><div class="grid-2">${textarea('kleverdi.about','Что для меня КлеверДи?',s.kleverdi.about)}${textarea('kleverdi.tasks','В каких занятиях, мероприятиях или задачах я участвовал?',s.kleverdi.tasks)}${textarea('kleverdi.tools','Что нового я попробовал или изучил?',s.kleverdi.tools)}${textarea('kleverdi.interesting','Что было самым интересным?',s.kleverdi.interesting)}${textarea('kleverdi.difficult','Что было самым сложным?',s.kleverdi.difficult)}</div><div class="divider"></div><h3>Моё предложение</h3><div class="grid-2">${input('kleverdi.ideaTitle','Название идеи',s.kleverdi.ideaTitle,'Например: студенческий клуб')}${textarea('kleverdi.ideaProblem','Что можно улучшить?',s.kleverdi.ideaProblem)}${textarea('kleverdi.ideaSolution','Что я предлагаю?',s.kleverdi.ideaSolution)}</div></section>`}
function renderCerts(s){return `<section class="grid"><div class="panel"><h3>Добавить достижение</h3><form class="form" data-add="certs">${input('','Название','','Сертификат / конкурс / мероприятие')}${input('','Организация','','КлеверДи / колледж')}${input('','Дата',today(),'','date')}${textarea('','Описание','')}${input('','Файл / фото / ссылка','','https://...')}<button class="btn primary">Добавить</button></form></div><div class="panel"><h3>Сертификаты и достижения</h3>${listItems(s.certs,'certs')}</div></section>`}
function renderReview(s){return `<section class="grid"><div class="panel"><h3>Самооценка студента</h3><div class="grid-2">${['regular:Я регулярно выполнял задания','computer:Я стал более самостоятельным','newSkill:Я научился новому','portfolio:Я добавлял работы в портфолио','team:Я работал в команде','help:Я помогал другим','errors:Я исправлял ошибки','result:Я могу показать результат','confidence:Я стал увереннее'].map(x=>{const [k,l]=x.split(':');return `<div class="skill-card"><div class="skill-head"><b>${l}</b><span class="badge">${s.self[k]}/5</span></div><input class="range" data-bind="self.${k}" type="range" min="1" max="5" value="${s.self[k]}"></div>`}).join('')}</div><div class="divider"></div>${textarea('self.proud','Чем я горжусь?',s.self.proud)}${textarea('self.improve','Что нужно улучшить?',s.self.improve)}${textarea('self.next','Что сделаю дальше?',s.self.next)}</div><div class="panel"><h3>Отзыв преподавателя</h3><p class="help">Этот блок может заполнить преподаватель на общем компьютере или после импорта JSON.</p>${textarea('teacher.strengths','Сильные стороны',s.teacher.strengths)}${textarea('teacher.recommendations','Рекомендации',s.teacher.recommendations)}<div class="field"><label>Итоговый уровень</label><select class="select" data-bind="teacher.level">${['Начальный','Развивающийся','Уверенный','Перспективный','Готов к активной работе'].map(v=>`<option ${s.teacher.level===v?'selected':''}>${v}</option>`).join('')}</select></div>${textarea('teacher.comment','Комментарий',s.teacher.comment)}</div></section>`}
function renderPreviewPanel(s){return `<section class="panel"><div class="section-title no-print"><div><h3>Готовое портфолио</h3><p>Можно распечатать или сохранить как PDF.</p></div><button class="btn primary" onclick="window.print()">PDF / Печать</button></div>${renderPreview(s)}</section>`}
function renderPreview(s){return `<article class="preview"><div class="preview-cover"><div class="preview-avatar">${s.photo?`<img src="${s.photo}" alt="">`:esc(initials(s.fullName))}</div><div><h2>${esc(s.fullName)}</h2><p>${esc(s.group)} · ${esc(s.course)} · ${esc(s.speciality)}</p><p>${esc(s.direction)}</p></div></div><div class="preview-body"><h3>Обо мне</h3><p>${nl(s.about||'Не заполнено')}</p><h3>Цель на 1 курс</h3><p>${nl(s.goalYear||'Не заполнено')}</p><h3>Личные качества и навыки</h3><ul>${s.skills.filter(x=>+x.current>=3).map(x=>`<li>${esc(x.name)} — ${x.current}/5</li>`).join('') || '<li>Пока не заполнено</li>'}</ul><h3>Проекты и активности</h3>${s.projects.length?s.projects.map(p=>`<p><b>${esc(p.title)}</b> — ${esc(p.type||'')}<br>${nl(p.description||p.lesson)}</p>`).join(''):'<p>Пока не добавлены.</p>'}<h3>Интересы</h3>${s.interests.length?s.interests.map(i=>`<p><b>${esc(i.name)}</b> — ${esc(i.description||'')}</p>`).join(''):'<p>Пока не добавлены.</p>'}<h3>Опыт в КлеверДи</h3><p>${nl(s.kleverdi.tasks||'Не заполнено')}</p><h3>Моё предложение</h3><p><b>${esc(s.kleverdi.ideaTitle||'Не заполнено')}</b><br>${nl(s.kleverdi.ideaSolution||'')}</p><h3>Достижения</h3>${s.certs.length?s.certs.map(c=>`<p><b>${esc(c.title)}</b> — ${esc(c.organization||'')}</p>`).join(''):'<p>Пока нет достижений.</p>'}<h3>Прогресс</h3>${progressHTML(s)}</div></article>`}


function bindStudentEvents(id,page){
  const root=$('#content');
  root?.addEventListener('input', e=>{
    const el=e.target;
    if(el.dataset.bind){
      Store.updateStudent(id, s=>setPath(s, el.dataset.bind, el.type==='range'?Number(el.value):el.value));
      if(el.type==='range') renderStudent(id,page);
    }
    if(el.dataset.skill){ Store.updateStudent(id, s=>{const sk=s.skills.find(x=>x.id===el.dataset.skill); if(sk) sk[el.dataset.field]=el.type==='range'?Number(el.value):el.value;}); if(el.type==='range') renderStudent(id,page); }
  });
  root?.addEventListener('change', e=>{
    const el=e.target;
    if(el.id==='photoInput' && el.files?.[0]){ const reader=new FileReader(); reader.onload=()=>{Store.updateStudent(id,s=>{s.photo=reader.result;}); renderStudent(id,page);}; reader.readAsDataURL(el.files[0]); }
  });
  root?.addEventListener('submit', e=>{
    const form=e.target.closest('[data-add]'); if(!form) return; e.preventDefault();
    const vals=$$('input,textarea,select',form).map(x=>x.value.trim()); const type=form.dataset.add;
    Store.updateStudent(id, s=>addItem(s,type,vals)); Toast.show('Добавлено'); renderStudent(id,page);
  });
  root?.addEventListener('click', e=>{
    const del=e.target.closest('[data-del]'); if(del){ Store.updateStudent(id, s=>{s[del.dataset.del]=s[del.dataset.del].filter(x=>x.id!==del.dataset.id);}); renderStudent(id,page); }
    const send=e.target.closest('#sendAgain'); if(send){ Collector.submit(Store.getStudent(id),'manual',true); }
  });
}
function addItem(s,type,v){
  if(type==='works') s.works.push({id:uid(),title:v[0],subject:v[1],date:v[2],description:v[3],result:v[4],proof:v[5]});
  if(type==='projects') s.projects.push({id:uid(),title:v[0],type:v[1],date:v[2],role:v[3],goal:v[4],description:v[5],error:v[6],lesson:v[7],link:v[8]});
  if(type==='interests') s.interests.push({id:uid(),name:v[0],type:v[1],description:v[2]});
  if(type==='diary') s.diary.push({id:uid(),date:v[0],title:v[1],learned:v[2],hard:v[3],next:v[4]});
  if(type==='teamwork') s.teamwork.push({id:uid(),title:v[0],role:v[1],tasks:v[2],description:v[3],lesson:v[4]});
  if(type==='certs') s.certs.push({id:uid(),title:v[0],organization:v[1],date:v[2],description:v[3],link:v[4]});
}

function renderTeacher(page){
  const students=Store.students(); const cfg=Store.getConfig();
  app.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="side-card"><div class="brand"><div class="logo">K</div><span>Преподаватель</span></div><nav class="nav"><button class="active" data-tpage="teacher-dashboard">📊 Все студенты</button><button data-tpage="teacher-settings">⚙️ Сбор данных</button></nav><div class="side-actions"><button class="btn light" id="logoutTeacher">Выйти</button></div></div></aside><main class="main"><div class="topbar"><div><h2>${page==='teacher-settings'?'Сбор данных':'Админ-панель'}</h2><p>${page==='teacher-settings'?'Настройка Google Sheets и импорт/экспорт.':'Список студентов, прогресс и быстрый просмотр.'}</p></div><div class="top-actions"><button class="btn light" id="teacherExportJSON">Экспорт JSON</button><button class="btn light" id="teacherExportCSV">Экспорт CSV</button></div></div>${page==='teacher-settings'?renderTeacherSettings(cfg):renderTeacherDashboard(students)}</main><nav class="bottom-nav no-print"><button class="active" data-tpage="teacher-dashboard"><span>📊</span><span>Студенты</span></button><button data-tpage="teacher-settings"><span>⚙️</span><span>Сбор</span></button><button id="logoutTeacher2"><span>↩️</span><span>Выйти</span></button></nav></div>`;
  $$('[data-tpage]').forEach(b=>b.onclick=()=>{Session.set({role:'teacher',page:b.dataset.tpage}); render();});
  $('#logoutTeacher')?.addEventListener('click',()=>{Session.clear();render();}); $('#logoutTeacher2')?.addEventListener('click',()=>{Session.clear();render();});
  $('#teacherExportJSON')?.addEventListener('click',()=>downloadJSON('kleverdi-students.json', {exportedAt:new Date().toISOString(), students:Store.students()}));
  $('#teacherExportCSV')?.addEventListener('click',()=>downloadText('kleverdi-students.csv', toCSV(Store.students()), 'text/csv;charset=utf-8'));
  bindTeacherEvents();
}
function renderTeacherDashboard(students){
  const avg=students.length?Math.round(students.reduce((a,s)=>a+completion(s),0)/students.length):0;
  return `<section><div class="stats"><div class="stat"><strong>${students.length}</strong><span>студентов</span></div><div class="stat"><strong>${avg}%</strong><span>средний прогресс</span></div><div class="stat"><strong>${students.reduce((a,s)=>a+s.projects.length,0)}</strong><span>активностей</span></div><div class="stat"><strong>${students.filter(s=>s.collect?.lastStatus==='sent').length}</strong><span>сдано</span></div></div><div class="panel"><div class="searchbar"><input class="input" id="searchStudent" placeholder="Поиск по Ф.И.О. или группе"><button class="btn light" id="importBtn">Импорт JSON</button><input class="hidden" type="file" id="importFile" accept="application/json"></div><div class="admin-list" id="adminList">${students.map(renderStudentCard).join('')}</div></div></section>`;
}
function renderStudentCard(s){return `<article class="student-card" data-student-card="${s.id}" data-text="${esc((s.fullName+' '+s.group).toLowerCase())}"><div class="student-top"><div class="avatar">${s.photo?`<img src="${s.photo}" alt="">`:esc(initials(s.fullName))}</div><div><b>${esc(s.fullName)}</b><span>${esc(s.group)} · ${completion(s)}% · ${syncLabel(s)}</span></div></div>${progressHTML(s)}<div class="badges"><span class="badge">${s.projects.length} активностей</span><span class="badge">${s.works.length} работ</span><span class="badge">${s.interests.length} интересов</span></div><div class="item-actions"><button class="btn small primary" data-view-student="${s.id}">Открыть</button><button class="btn small light" data-download-student="${s.id}">JSON</button><button class="btn small danger" data-delete-student="${s.id}">Удалить</button></div></article>`}
function renderTeacherSettings(cfg){return `<section class="grid"><div class="panel"><div class="section-title"><div><h3>Google Sheets сборщик</h3><p>Сайт остаётся фронтендом. Данные отправляются в таблицу через Apps Script URL.</p></div></div><div class="form"><div class="field"><label>Apps Script Web App URL</label><input class="input" id="collectorInput" value="${esc(collectorUrl())}" placeholder="https://script.google.com/macros/s/.../exec"></div><button class="btn primary" id="saveCollector">Сохранить URL</button><p class="help">Чтобы URL был у всех студентов, лучше вставить его также в <code>js/config.js</code> перед загрузкой сайта на хостинг.</p></div></div><div class="panel"><h3>Как собирать данные</h3><div class="checklist"><div class="check"><i>1</i><span>Создайте Google Sheet.</span></div><div class="check"><i>2</i><span>Откройте Extensions → Apps Script.</span></div><div class="check"><i>3</i><span>Вставьте код из файла <b>google-apps-script/Code.gs</b>.</span></div><div class="check"><i>4</i><span>Deploy → New deployment → Web app.</span></div><div class="check"><i>5</i><span>Access: Anyone, затем вставьте Web App URL сюда или в <b>config.js</b>.</span></div></div></div><div class="panel"><h3>Локальный сбор</h3><p class="help">Если Google Sheets не подключён, все данные собираются только на том устройстве, где открывали сайт. Для кабинета информатики это может работать как локальный журнал.</p><button class="btn danger" id="resetAll">Сбросить демо-данные</button></div></section>`}
function bindTeacherEvents(){
  $('#searchStudent')?.addEventListener('input', e=>{const q=e.target.value.toLowerCase().trim(); $$('[data-student-card]').forEach(c=>c.classList.toggle('hidden', !c.dataset.text.includes(q)));});
  $('#importBtn')?.addEventListener('click',()=>$('#importFile').click());
  $('#importFile')?.addEventListener('change',e=>{const f=e.target.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{try{const data=JSON.parse(r.result); const arr=data.students||[data.portfolio||data].filter(Boolean); arr.forEach(s=>Store.replaceStudent(s)); Toast.show('Импорт выполнен'); render();}catch{Toast.show('JSON не распознан')}}; r.readAsText(f);});
  $('#saveCollector')?.addEventListener('click',()=>{Store.setConfigPatch({collectorUrl:$('#collectorInput').value.trim()}); Toast.show('URL сохранён в этом браузере');});
  $('#resetAll')?.addEventListener('click',()=>{ if(confirm('Сбросить все локальные данные?')){Store.reset(); Toast.show('Сброшено'); render();} });
  $('#adminList')?.addEventListener('click',e=>{const v=e.target.closest('[data-view-student]'); const d=e.target.closest('[data-download-student]'); const del=e.target.closest('[data-delete-student]'); if(v){Session.set({role:'student',studentId:v.dataset.viewStudent,page:'preview'}); render();} if(d){const s=Store.getStudent(d.dataset.downloadStudent); downloadJSON(`portfolio-${slug(s.fullName)}.json`, collectPayload(s,'teacher-export'));} if(del){if(confirm('Удалить студента из локального списка?')){Store.deleteStudent(del.dataset.deleteStudent); render();}}});
}

function downloadJSON(name,obj){ downloadText(name, JSON.stringify(obj,null,2), 'application/json;charset=utf-8'); }
function downloadText(name,text,type){ const blob=new Blob([text],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),500); }
function toCSV(students){
  const rows=[['ФИО','Группа','Курс','Специальность','Телефон','Email','Прогресс','Работы','Активности','Интересы','Дневник','Команда','КлеверДи идея','Статус сдачи','Обновлено']];
  students.forEach(s=>rows.push([s.fullName,s.group,s.course,s.speciality,s.phone,s.email,completion(s),s.works.length,s.projects.length,s.interests.length,s.diary.length,s.teamwork.length,s.kleverdi.ideaTitle,s.collect?.lastStatus||'',s.updatedAt]));
  return rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
}

render();
