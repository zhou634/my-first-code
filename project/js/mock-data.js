// Mock 数据 — 校园二手平台

const MOCK_USERS = [
  { id: 'u1', username: '张三', studentId: '20230101001', realName: '张三', role: 'student', campus: '主校区', avatar: '', phone: '138****1234', joinDate: '2025-09-01', bio: '计算机学院大三，热爱数码，经常换设备', creditScore: 45 },
  { id: 'u2', username: '李思雨', studentId: '20230205012', realName: '李思雨', role: 'student', campus: '东校区', avatar: '', phone: '139****5678', joinDate: '2025-09-15', bio: '外语学院大二，爱买衣服爱干净', creditScore: 28 },
  { id: 'u3', username: '王博文', studentId: '20230108023', realName: '王博文', role: 'student', campus: '西校区', avatar: '', phone: '137****9012', joinDate: '2024-11-08', bio: '机电学院研二，健身达人，毕业在即清宿舍', creditScore: 62 },
  { id: 'u4', username: '赵雨萱', studentId: '20230203005', realName: '赵雨萱', role: 'student', campus: '主校区', avatar: '', phone: '136****3456', joinDate: '2025-10-01', bio: '经管学院大四学姐，考研上岸出资料', creditScore: 35 },
  { id: 'u5', username: 'admin', studentId: 'T2024001', realName: '管理员', role: 'admin', campus: '主校区', avatar: '', phone: '135****0000', joinDate: '2024-01-01', bio: '平台管理员', creditScore: 100 },
];

const MOCK_PRODUCTS = [
  { id: 'p1', title: '《高等数学》同济第七版 上下册 9成新', description: '大一两学期用完，书角无折痕，内页少量笔记（铅笔），习题基本没做。考研换资料出。', price: 25, originalPrice: 78, category: '教材教辅', imageSeed: 'mathbook', sellerId: 'u1', condition: 'good', campus: '主校区', pickupSpot: '图书馆门口', postDate: '2026-05-19', status: 'active', views: 156 },
  { id: 'p2', title: 'MacBook Air M1 8+256G 深空灰 95新', description: '2024年初京东购入，用了一年多主要写论文看视频。循环充电120次，电池健康92%。无磕碰划痕，屏幕完美，键盘无油光。原装充电器+包装盒都在。', price: 3500, originalPrice: 6599, category: '电子数码', imageSeed: 'macbook', sellerId: 'u3', condition: 'likeNew', campus: '西校区', pickupSpot: '实验楼', postDate: '2026-05-18', status: 'active', views: 423 },
  { id: 'p3', title: '考研数学一 张宇1000题+真题大全解 全新', description: '买了之后决定保研了，全新未动过。1000题+真题解析+高数18讲三本打包出。', price: 45, originalPrice: 128, category: '考研考公', imageSeed: 'kaoyan', sellerId: 'u4', condition: 'new', campus: '主校区', pickupSpot: '教学楼A区', postDate: '2026-05-17', status: 'active', views: 278 },
  { id: 'p4', title: '落地折叠桌 宿舍床上书桌 白色', description: '用了两学期，桌面干净无划痕，折叠方便收纳。毕业清理宿舍便宜出。尺寸60x40cm。', price: 29, originalPrice: 89, category: '宿舍好物', imageSeed: 'desk', sellerId: 'u3', condition: 'good', campus: '西校区', pickupSpot: '宿舍1号楼', postDate: '2026-05-16', status: 'active', views: 89 },
  { id: 'p5', title: 'iPad Air 5 64G WiFi 蓝色 带笔', description: '主要用来做笔记，备考期间使用频率高。屏幕贴了类纸膜，边框轻微使用痕迹。送Apple Pencil二代+保护壳。考研结束出。', price: 2800, originalPrice: 4399, category: '电子数码', imageSeed: 'ipad', sellerId: 'u4', condition: 'good', campus: '主校区', pickupSpot: '图书馆门口', postDate: '2026-05-15', status: 'active', views: 567 },
  { id: 'p6', title: '大学英语四级真题 星火英语 2025版', description: '只做了两套，其他全新。含听力光盘未拆封。送四级词汇闪过一本。', price: 12, originalPrice: 45, category: '教材教辅', imageSeed: 'cet4', sellerId: 'u1', condition: 'good', campus: '主校区', pickupSpot: '教学楼B区', postDate: '2026-05-14', status: 'active', views: 134 },
  { id: 'p7', title: '哑铃套装 20kg可调节 送瑜伽垫', description: '体育课买的，练了一个学期。哑铃片有轻微掉漆不影响使用，握手处完好。送一张加厚瑜伽垫（9成新）。仅限校内自提。', price: 89, originalPrice: 259, category: '运动健身', imageSeed: 'dumbbell', sellerId: 'u3', condition: 'good', campus: '西校区', pickupSpot: '体育馆', postDate: '2026-05-13', status: 'active', views: 201 },
  { id: 'p8', title: '床上挂篮 衣柜收纳神器 3个装', description: '宿舍必备！铁质白色烤漆，承重好。用了半年，有轻微使用痕迹。含挂钩。毕业出。', price: 15, originalPrice: 39, category: '宿舍好物', imageSeed: 'storage', sellerId: 'u4', condition: 'normal', campus: '主校区', pickupSpot: '二食堂', postDate: '2026-05-12', status: 'active', views: 67 },
  { id: 'p9', title: '华为 FreeBuds Pro 3 无线耳机 银', description: '去年双十一买的，用了半年，降噪效果还是很棒。充电仓有轻微划痕（放包里蹭的），耳机本体完好。续航正常。换AirPods故出。', price: 499, originalPrice: 1199, category: '电子数码', imageSeed: 'earbuds', sellerId: 'u1', condition: 'good', campus: '主校区', pickupSpot: '一食堂', postDate: '2026-05-11', status: 'active', views: 345 },
  { id: 'p10', title: '《数据结构》严蔚敏 + 配套习题解析', description: '经典的考研408教材，书中有荧光笔标注重点，不影响阅读。两本一起出。', price: 18, originalPrice: 59, category: '教材教辅', imageSeed: 'datastruct', sellerId: 'u4', condition: 'normal', campus: '主校区', pickupSpot: '图书馆门口', postDate: '2026-05-10', status: 'active', views: 189 },
  { id: 'p11', title: '宿舍用小功率电煮锅 1.5L', description: '冬天煮面煮粥神器，功率只有600W宿舍可以用。内胆不粘涂层完好，用过一学期。送一个蒸架。', price: 22, originalPrice: 69, category: '宿舍好物', imageSeed: 'cooker', sellerId: 'u2', condition: 'good', campus: '东校区', pickupSpot: '东苑食堂', postDate: '2026-05-09', status: 'active', views: 312 },
  { id: 'p12', title: '考研政治 肖秀荣全家桶 2026版', description: '包括精讲精练+1000题+8套卷+4套卷，全新未拆封。保研成功故出。', price: 55, originalPrice: 168, category: '考研考公', imageSeed: 'politics', sellerId: 'u1', condition: 'new', campus: '主校区', pickupSpot: '教学楼A区', postDate: '2026-05-08', status: 'active', views: 445 },
  { id: 'p13', title: '罗技 K380 无线蓝牙键盘 粉色', description: '搭配iPad使用办公，电池仓正常，按键灵敏。表面轻微使用痕迹，底部防滑垫完好。换机械键盘故出。', price: 79, originalPrice: 199, category: '电子数码', imageSeed: 'keyboard', sellerId: 'u2', condition: 'good', campus: '东校区', pickupSpot: '实验楼', postDate: '2026-05-07', status: 'active', views: 167 },
  { id: 'p14', title: '纯棉床品三件套 1.2m宿舍床 灰格', description: '只用了一学期，洗过两次，不起球不褪色。含床单+被套+枕套。毕业清理出。', price: 35, originalPrice: 129, category: '生活用品', imageSeed: 'bedding', sellerId: 'u3', condition: 'good', campus: '西校区', pickupSpot: '宿舍3号楼', postDate: '2026-05-06', status: 'active', views: 98 },
  { id: 'p15', title: '公务员考试 行测+申论 中公2026', description: '买来准备国考的，后来签了工作不考了。行测做了前两章（铅笔），申论全新。两本打包出。', price: 35, originalPrice: 118, category: '考研考公', imageSeed: 'gongkao', sellerId: 'u3', condition: 'good', campus: '西校区', pickupSpot: '图书馆', postDate: '2026-05-05', status: 'active', views: 234 },
  { id: 'p16', title: 'Nike 跑步鞋 Air Zoom 43码 黑色', description: '夜跑用的，鞋底磨损不严重。因为买了新的跑鞋所以把这双出了。鞋垫还可以继续用很久。', price: 129, originalPrice: 529, category: '运动健身', imageSeed: 'nikeshoe', sellerId: 'u1', condition: 'normal', campus: '主校区', pickupSpot: '操场', postDate: '2026-05-04', status: 'active', views: 156 },
  { id: 'p17', title: '《英语词汇闪过》+《长难句解密》24版', description: '准备考研时买的经典搭配，词汇书有少量勾画，长难句全新。结束考研便宜出。', price: 15, originalPrice: 56, category: '考研考公', imageSeed: 'vocab', sellerId: 'u4', condition: 'good', campus: '主校区', pickupSpot: '二食堂', postDate: '2026-05-03', status: 'active', views: 178 },
  { id: 'p18', title: 'LED酷毙灯 宿舍磁吸灯管 双色温', description: '贴在床头用了半年，三种色温可调，亮度很足。UBS供电方便，磁吸可拆卸。毕业甩卖。', price: 12, originalPrice: 35, category: '宿舍好物', imageSeed: 'lamp', sellerId: 'u3', condition: 'good', campus: '西校区', pickupSpot: '宿舍1号楼', postDate: '2026-05-02', status: 'active', views: 234 },
  { id: 'p19', title: 'ZARA 女士风衣 米白色 M码', description: '去年秋天买的，穿了不到五次。面料挺括有质感，版型很好。洗过一次，状态如新。', price: 99, originalPrice: 459, category: '服饰美妆', imageSeed: 'coat', sellerId: 'u2', condition: 'likeNew', campus: '东校区', pickupSpot: '东门传达室', postDate: '2026-05-01', status: 'active', views: 212 },
  { id: 'p20', title: 'Switch OLED 喷射战士3限定 + 3个游戏', description: '去年生日礼物，通关了几个独占就吃灰了。手柄无漂移，屏幕贴膜完好。含塞尔达+马里奥+喷射3三张卡带+收纳包。', price: 1799, originalPrice: 2899, category: '其他', imageSeed: 'switch', sellerId: 'u1', condition: 'likeNew', campus: '主校区', pickupSpot: '一食堂', postDate: '2026-04-30', status: 'active', views: 678 },
  { id: 'p21', title: '羽毛球拍一对 胜利挑战者9500', description: '羽毛球选修课买的，上完课就不打了。拍面完好，握把胶略有磨损。送3个羽毛球。', price: 69, originalPrice: 199, category: '运动健身', imageSeed: 'badminton', sellerId: 'u2', condition: 'good', campus: '东校区', pickupSpot: '体育馆', postDate: '2026-04-29', status: 'active', views: 145 },
  { id: 'p22', title: '考研408计算机综合 王道4本全套', description: '数据结构+计组+操作系统+计网，考研408经典教材。有少量铅笔标记，不影响阅读。四本打包不单卖。', price: 48, originalPrice: 168, category: '考研考公', imageSeed: 'cs408', sellerId: 'u4', condition: 'good', campus: '主校区', pickupSpot: '教学楼B区', postDate: '2026-04-28', status: 'active', views: 345 },
  { id: 'p23', title: '美的电热水壶 1.7L 不锈钢 宿舍可用', description: '用了不到一学期，内胆无水垢（一直用的纯净水），外观干净。功率1000W大多数宿舍都能用。', price: 25, originalPrice: 79, category: '生活用品', imageSeed: 'kettle', sellerId: 'u3', condition: 'good', campus: '西校区', pickupSpot: '西苑食堂', postDate: '2026-04-27', status: 'active', views: 78 },
  { id: 'p24', title: '毕业清仓：全新未拆封洗漱套装+文具', description: '囤货太多用不完！含洗漱包（全新）+笔记本5本（未使用）+中性笔20支+收纳盒一个。打包出，随缘送小东西。', price: 29, originalPrice: 99, category: '其他', imageSeed: 'gradbag', sellerId: 'u4', condition: 'new', campus: '主校区', pickupSpot: '宿舍3号楼', postDate: '2026-04-26', status: 'active', views: 189 },
];

const MOCK_MESSAGES = [
  { id: 'm1', fromUserId: 'u1', toUserId: 'u2', productId: 'p6', content: '你好，四级真题还在吗？', timestamp: '2026-05-19T10:30:00' },
  { id: 'm2', fromUserId: 'u2', toUserId: 'u1', productId: 'p6', content: '在的！可以今天图书馆门口面交', timestamp: '2026-05-19T10:32:00' },
  { id: 'm3', fromUserId: 'u1', toUserId: 'u2', productId: 'p6', content: '好的，10块钱行吗？', timestamp: '2026-05-19T10:33:00' },
  { id: 'm4', fromUserId: 'u2', toUserId: 'u1', productId: 'p6', content: '可以，下午3点可以吗？', timestamp: '2026-05-19T10:35:00' },
  { id: 'm5', fromUserId: 'u1', toUserId: 'u2', productId: 'p6', content: '没问题，下午3点图书馆门口见', timestamp: '2026-05-19T10:36:00' },
  { id: 'm6', fromUserId: 'u4', toUserId: 'u3', productId: 'p2', content: 'MacBook电池续航怎么样？', timestamp: '2026-05-18T14:20:00' },
  { id: 'm7', fromUserId: 'u3', toUserId: 'u4', productId: 'p2', content: '电池健康度92%，正常办公续航10小时左右', timestamp: '2026-05-18T14:22:00' },
];

const MOCK_ORDERS = [
  { id: 'o1', productId: 'p8', buyerId: 'u2', sellerId: 'u4', status: 'completed', createTime: '2026-05-10T16:30:00', price: 15 },
  { id: 'o2', productId: 'p13', buyerId: 'u1', sellerId: 'u2', status: 'shipped', createTime: '2026-05-15T09:00:00', price: 79 },
  { id: 'o3', productId: 'p23', buyerId: 'u2', sellerId: 'u3', status: 'pending', createTime: '2026-05-19T11:15:00', price: 25 },
];

// 信用评价记录
const MOCK_RATINGS = [
  { id: 'r1', orderId: 'o1', fromUserId: 'u2', toUserId: 'u4', score: 5, comment: '学姐人很好，交易很顺利！', timestamp: '2026-05-11T10:00:00' },
  { id: 'r2', orderId: 'o1', fromUserId: 'u4', toUserId: 'u2', score: 5, comment: '学妹很准时，好评！', timestamp: '2026-05-11T11:00:00' },
];
