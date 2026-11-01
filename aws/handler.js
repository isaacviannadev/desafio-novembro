const{DynamoDBClient}=require('@aws-sdk/client-dynamodb');
const{DynamoDBDocumentClient,ScanCommand,PutCommand,UpdateCommand}=require('@aws-sdk/lib-dynamodb');
const crypto=require('crypto');
const db=DynamoDBDocumentClient.from(new DynamoDBClient({}));
const T=process.env.TABLE,MAX=+process.env.MAX_PLAYERS||100;
const KEYS=['gym','cardio','alc','ff','agua','fruta','ler','tela'];
const H=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const R=(c,b)=>({statusCode:c,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(b)});
const nickOf=s=>String(s||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,24);
function daysOf(d){const o={};if(!d||typeof d!=='object')return o;
for(let n=1;n<=30;n++){const v=d[n];if(!v||typeof v!=='object')continue;const x={};
for(const k of KEYS)if(v[k]===true)x[k]=true;if(Object.keys(x).length)o[n]=x}return o}
async function all(){const out=[];let k;do{const r=await db.send(new ScanCommand({TableName:T,ExclusiveStartKey:k}));out.push(...r.Items);k=r.LastEvaluatedKey}while(k);return out}
const pub=p=>({id:p.id,nick:p.nick,joinedAt:p.joinedAt,updatedAt:p.updatedAt,days:p.days||{}});
exports.handler=async e=>{
const m=e.requestContext.http.method,p=(e.rawPath||'/').replace(/\/+$/,'')||'/';
try{
if(m==='GET'&&p==='/players')return R(200,{players:(await all()).map(pub)});
let b={};try{b=JSON.parse(e.isBase64Encoded?Buffer.from(e.body||'','base64').toString():(e.body||'{}'))}catch(_){return R(400,{error:'bad_json'})}
if(m==='POST'&&p==='/players'){const nick=nickOf(b.nick);if(!nick)return R(400,{error:'nick'});
if((await all()).length>=MAX)return R(403,{error:'full'});
const id=crypto.randomUUID(),token=crypto.randomBytes(24).toString('base64url'),now=Date.now();
const item={id,nick,joinedAt:now,updatedAt:now,days:{},tokenHash:H(token)};
await db.send(new PutCommand({TableName:T,Item:item,ConditionExpression:'attribute_not_exists(id)'}));
return R(201,{token,player:pub(item)})}
const mm=p.match(/^\/players\/([0-9a-f-]{36})$/);
if(m==='PUT'&&mm){const tok=String((e.headers||{}).authorization||'').replace(/^Bearer\s+/i,'');if(!tok)return R(401,{error:'token'});
const names={'#d':'days','#u':'updatedAt'},vals={':h':H(tok),':d':daysOf(b.days),':u':Date.now()};let set='SET #d=:d, #u=:u';
if(b.nick!==undefined){const nick=nickOf(b.nick);if(!nick)return R(400,{error:'nick'});names['#n']='nick';vals[':n']=nick;set+=', #n=:n'}
const r=await db.send(new UpdateCommand({TableName:T,Key:{id:mm[1]},UpdateExpression:set,ConditionExpression:'tokenHash = :h',ExpressionAttributeNames:names,ExpressionAttributeValues:vals,ReturnValues:'ALL_NEW'}));
return R(200,{player:pub(r.Attributes)})}
return R(404,{error:'not_found'})
}catch(err){if(err&&err.name==='ConditionalCheckFailedException')return R(403,{error:'forbidden'});console.error(err);return R(500,{error:'server'})}};
