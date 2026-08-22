// 角色注册表：想新增角色，把图片放进 assets/ 后只需在数组里加一个对象即可。
// 字段说明：
//   id     : 唯一标识（英文/拼音）
//   name   : 显示名称（托盘菜单、设置里看到的）
//   bg     : 气泡描边主色（十六进制）
//   src    : 角色图片路径（相对于项目根目录，推荐 assets/<id>.png，建议 1024x1024 透明背景）
//   phrases: 随机冒泡台词数组
const characters = [
  {
    id: 'machine-cat',
    name: '机器猫',
    bg: '#2b6cff',
    src: 'assets/machine-cat.png',
    phrases: ['口袋里装满了好运！', '今天也要加油哦~', '喵~ 陪你一起工作', '叮咚！有新道具啦'],
  },
  {
    id: 'gourd-bro',
    name: '葫芦兄弟',
    bg: '#ff7a3c',
    src: 'assets/gourd-bro.png',
    phrases: ['葫芦娃，葫芦娃~', '兄弟齐心，其利断金！', '妖怪，哪里跑！', '我最能打啦！'],
  },
  {
    id: 'monkey-king',
    name: '齐天大圣',
    bg: '#e67e22',
    src: 'assets/monkey-king.png',
    phrases: ['俺老孙来也！', '金箍棒，重一万三千斤！', '齐天大圣在此！', '吃俺老孙一棒！'],
  },
  {
    id: 'shuke-beta',
    name: '舒克和贝塔',
    bg: '#8e6b3e',
    src: 'assets/shuke-beta.png',
    phrases: ['舒克舒克，开飞机的舒克', '贝塔贝塔，开坦克的贝塔', '老鼠怕猫，那是谣传！', '我们一起去冒险！'],
  },
  {
    id: 'dirty-king',
    name: '邋遢大王',
    bg: '#b08d3a',
    src: 'assets/dirty-king.png',
    phrases: ['我是邋遢大王！', '干净算什么，快乐最重要！', '嘿嘿，又弄脏了~', '邋遢也是一种风格！'],
  },
];

module.exports = characters;