import { useCanOperate } from '../../utils/permissions';

/** Chỉ hiện nội dung bên trong cho người được vận hành kho (ADMIN, MANAGER, STAFF); VIEWER không thấy. */
export default function OperateOnly({ children }) {
  return useCanOperate() ? children : null;
}
