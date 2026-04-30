import type { Story, Meeting } from '@/types/domain';

export const mockStories: Story[] = [
  {
    id: 'story-1',
    familyId: 'demo',
    title: '祖父的奋斗岁月',
    relatedPersonIds: [],
    year: 1978,
    content:
      '1978年改革开放之初，祖父凭借一股韧劲儿，从农村走到了城市。那时物资匮乏，但他始终相信勤劳能改变命运。他常说："家是根，只要根还在，枝叶就能繁茂。"这句话成了我们家的家训，一代代传了下来。',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'story-2',
    familyId: 'demo',
    title: '父母的相识',
    relatedPersonIds: [],
    year: 1990,
    content:
      '1990年夏天，父亲因工作调动来到母亲所在的城市。两人因参加同一个文艺演出而相识，从此结下了一生的缘分。那场演出，成了我们家族史上最美丽的序章。',
    createdAt: '2024-02-20T00:00:00Z',
  },
  {
    id: 'story-3',
    familyId: 'demo',
    title: '老屋的记忆',
    relatedPersonIds: [],
    year: 2005,
    content:
      '老家的那栋房子建于1960年代，青砖黛瓦，院子里有一棵老梨树。每年夏天我们都回去，梨树下是全家人乘凉的地方。2005年，老屋翻新，但那棵梨树被完整地保留了下来。',
    createdAt: '2024-03-10T00:00:00Z',
  },
];

export const mockMeetings: Meeting[] = [
  {
    id: 'meeting-1',
    familyId: 'demo',
    type: 'memorial_day',
    title: '年度家族团聚',
    content:
      '今年春节，我们计划在老家举行一次完整的家族聚会，欢迎海内外家人回来相聚。请各家提前规划行程，并回复确认出席人数。',
    status: 'open',
    createdAt: '2025-12-01T00:00:00Z',
  },
  {
    id: 'meeting-2',
    familyId: 'demo',
    type: 'notice',
    title: '家族相册整理通知',
    content:
      '我们正在整理家族历史老照片，请各位家人将珍贵的老照片拍照发送过来，共同建立家族影像档案，留存后代。',
    status: 'open',
    createdAt: '2025-11-15T00:00:00Z',
  },
  {
    id: 'meeting-3',
    familyId: 'demo',
    type: 'event',
    title: '奶奶八十寿辰',
    content:
      '奶奶今年迎来八十华诞，我们计划举办一个温馨的家庭寿宴。请各家人确认出席，让奶奶感受到大家庭的温暖。',
    status: 'open',
    createdAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'meeting-4',
    familyId: 'demo',
    type: 'vote',
    title: '家史册封面方案征集',
    content:
      '家史册即将完稿，请各位家人对封面设计方案进行投票，选出最能代表我们家族精神的方案。共有三套方案供选择。',
    status: 'open',
    createdAt: '2026-02-01T00:00:00Z',
  },
];

export const MEETING_TYPE_LABELS: Record<string, string> = {
  notice: '通知',
  vote: '投票',
  event: '聚会',
  memorial_day: '纪念日',
};

export const MEETING_TYPE_COLORS: Record<string, string> = {
  notice: 'bg-blue-50 text-blue-700',
  vote: 'bg-purple-50 text-purple-700',
  event: 'bg-green-50 text-green-700',
  memorial_day: 'bg-amber-50 text-amber-700',
};
