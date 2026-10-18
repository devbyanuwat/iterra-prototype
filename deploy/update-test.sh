#!/bin/sh
# ใช้บนเครื่องทดสอบเท่านั้น (iterra-update.timer เรียกทุก 5 นาที) · เครื่องจริงห้ามตั้ง timer นี้
# deploy.sh เช็กเองว่า image tag test เปลี่ยนหรือยัง ไม่เปลี่ยนก็จบเงียบ ๆ
exec "$(dirname "$0")/deploy.sh" test
