from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Reader, BookLoan

router = APIRouter(prefix="/api/readers", tags=["readers"])

@router.get("/{reader_id}")
async def get_reader(reader_id: int, db: Session = Depends(get_db)):
    try:
        reader = db.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Читатель не найден")
        
        return {
            "id": reader.reader_id,
            "fio": reader.fio,
            "dolzhnost": reader.dolzhnost or "",
            "uchenaya_stepen": reader.uchenaya_stepen or ""
        }
        
    except Exception as e:
        print(f"Error getting reader: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении данных читателя: {str(e)}")

@router.post("/")
async def add_reader(reader_data: dict, db: Session = Depends(get_db)):
    try:
        # Получаем данные из запроса
        fio = reader_data.get('fio')
        dolzhnost = reader_data.get('dolzhnost', '')
        uchenaya_stepen = reader_data.get('uchenaya_stepen', '')
        
        # Проверяем обязательное поле
        if not fio:
            raise HTTPException(status_code=400, detail="ФИО обязательно")
        
        # Проверяем, нет ли уже читателя с таким ФИО
        existing_reader = db.query(Reader).filter(Reader.fio == fio).first()
        if existing_reader:
            raise HTTPException(status_code=400, detail="Читатель с таким ФИО уже существует")
        
        # Создаем читателя
        reader = Reader(
            fio=fio.strip(),
            dolzhnost=dolzhnost.strip() if dolzhnost else None,
            uchenaya_stepen=uchenaya_stepen.strip() if uchenaya_stepen else None
        )
        
        db.add(reader)
        db.commit()
        
        return {"message": "Читатель успешно добавлен"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error adding reader: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при добавлении читателя: {str(e)}")

@router.put("/{reader_id}")
async def update_reader(reader_id: int, reader_data: dict, db: Session = Depends(get_db)):
    try:
        # Находим читателя
        reader = db.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Читатель не найден")
        
        # Получаем данные из запроса
        fio = reader_data.get('fio')
        dolzhnost = reader_data.get('dolzhnost', '')
        uchenaya_stepen = reader_data.get('uchenaya_stepen', '')
        
        # Проверяем обязательное поле
        if not fio:
            raise HTTPException(status_code=400, detail="ФИО обязательно")
        
        # Проверяем, нет ли другого читателя с таким ФИО
        existing_reader = db.query(Reader).filter(
            Reader.fio == fio,
            Reader.reader_id != reader_id
        ).first()
        if existing_reader:
            raise HTTPException(status_code=400, detail="Читатель с таким ФИО уже существует")
        
        # Обновляем данные читателя
        reader.fio = fio.strip()
        reader.dolzhnost = dolzhnost.strip() if dolzhnost else None
        reader.uchenaya_stepen = uchenaya_stepen.strip() if uchenaya_stepen else None
        
        db.commit()
        
        return {"message": "Читатель успешно обновлен"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating reader: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении читателя: {str(e)}")

@router.delete("/{reader_id}")
async def delete_reader(reader_id: int, db: Session = Depends(get_db)):
    try:
        # Находим читателя
        reader = db.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Читатель не найден")
        
        # Проверяем, есть ли активные займы у читателя
        active_loans = db.query(BookLoan).filter(
            BookLoan.reader_id == reader_id,
            BookLoan.loan_return_date == None
        ).count()
        
        if active_loans > 0:
            raise HTTPException(
                status_code=400, 
                detail="Нельзя удалить читателя с активными займами"
            )
        
        # Удаляем все займы читателя (историю)
        db.query(BookLoan).filter(BookLoan.reader_id == reader_id).delete()
        
        # Удаляем самого читателя
        db.delete(reader)
        db.commit()
        
        return {"message": "Читатель успешно удален"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting reader: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при удалении читателя: {str(e)}")
