import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import type {Script} from '../../types/script';
import {Button, LinkButton} from '../common';
import styles from './ScriptTable.module.css';

interface ScriptTableProps {
  scripts: Script[];
  onRun: (scriptId: string) => void;
}

export const ScriptTable = ({scripts, onRun}: ScriptTableProps) => {
  const {t} = useTranslation();

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle} title={t('folderDetail.scriptsTooltip')}>
        {t('folderList.scriptsCount')}
      </h2>

      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.iconCell}><span className="sr-only">{t('common.name')}</span></th>
              <th scope="col">{t('scriptDetail.scriptId')}</th>
              <th scope="col">{t('common.description')}</th>
              <th scope="col">{t('common.tags')}</th>
              <th scope="col">{t('common.updatedAt')}</th>
              <th scope="col" className={styles.actionsCell}>{t('folderDetail.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {scripts.map(script => (
              <tr key={script.scriptId}>
                <td className={styles.iconCell} aria-hidden="true">📄</td>
                <td>
                  <Link to={`/scripts/${script.scriptId}`} className={styles.scriptLink}>
                    {script.scriptId}
                  </Link>
                </td>
                <td className={styles.description}>
                  {script.description || <span className={styles.muted}>-</span>}
                </td>
                <td>
                  {script.tags && script.tags.length > 0 ? (
                    <div className={styles.tags}>
                      {script.tags.map(tag => (
                        <span key={tag} className={styles.tag}>{tag}</span>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.muted}>-</span>
                  )}
                </td>
                <td className={styles.time}>
                  {new Date(script.updatedAt).toLocaleString()}
                </td>
                <td>
                  <div className={styles.actions}>
                    <LinkButton to={`/scripts/${script.scriptId}`} variant="purple" size="sm">
                      {t('scriptDetail.viewDetails')}
                    </LinkButton>
                    <LinkButton
                      to={`/scripts/${script.scriptId}?edit=true`}
                      variant="gray"
                      size="sm"
                    >
                      {t('folderDetail.editScript')}
                    </LinkButton>
                    <Button size="sm" onClick={() => onRun(script.scriptId)}>
                      {t('folderDetail.runScript')}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
