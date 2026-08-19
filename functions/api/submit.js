const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders
    }
  });
}

// 处理浏览器跨域预检请求
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// GET 请求访问这个接口时，提示请使用 POST
export async function onRequestGet() {
  return json({ ok: false, error: '请使用 POST 请求' }, 405);
}

// 处理表单提交
export async function onRequestPost(context) {
  try {
    const data = await context.request.json();

    // 简单反垃圾：正常用户不会填写这个隐藏字段
    if (data.website) {
      return json({ ok: true });
    }

    const name = String(data.name || '').trim();
    const contact = String(data.contact || '').trim();
    const message = String(data.message || '').trim();

    // 基本校验
    if (!name || !message) {
      return json({ ok: false, error: '姓名和内容不能为空' }, 400);
    }

    if (name.length > 100) {
      return json({ ok: false, error: '姓名过长' }, 400);
    }

    if (contact.length > 200) {
      return json({ ok: false, error: '联系方式过长' }, 400);
    }

    if (message.length > 5000) {
      return json({ ok: false, error: '内容过长' }, 400);
    }

    // 写入 D1 数据库
    await context.env.DB.prepare(`
      INSERT INTO submissions (name, contact, message)
      VALUES (?, ?, ?)
    `)
      .bind(name, contact, message)
      .run();

    return json({ ok: true });
  } catch (error) {
    console.error('submit error:', error);

    return json({ ok: false, error: '服务器内部错误' }, 500);
  }
}
